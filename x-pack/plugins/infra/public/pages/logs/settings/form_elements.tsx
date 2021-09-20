/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import equal from 'fast-deep-equal';
import { useCallback, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { ObjectEntries } from '../../../../common/utility_types';
import { ChildFormValidationError, GenericValidationError } from './validation_errors';

const unsetValue = Symbol('unset form value');

type ValueUpdater<Value> = (updater: (previousValue: Value) => Value) => void;

export interface FormElement<Value, InvalidReason> {
  initialValue: Value;
  isDirty: boolean;
  resetValue: () => void;
  updateValue: ValueUpdater<Value>;
  validity: FormElementValidity<InvalidReason | GenericValidationError>;
  value: Value;
}

type FormElementMap<FormValues extends {}> = {
  [formElementName in keyof FormValues]: FormElement<FormValues[formElementName], any>;
};

export interface CompositeFormElement<CompositeValue extends {}, InvalidReason>
  extends FormElement<CompositeValue, InvalidReason | ChildFormValidationError> {
  childFormElements: FormElementMap<CompositeValue>;
}

export type FormElementValidity<InvalidReason> =
  | { validity: 'valid' }
  | { validity: 'invalid'; reasons: InvalidReason[] }
  | { validity: 'pending' };

export const useFormElement = <Value, InvalidReason>({
  initialValue,
  validate,
}: {
  initialValue: Value;
  validate?: (value: Value) => Promise<InvalidReason[]>;
}): FormElement<Value, InvalidReason> => {
  const [changedValue, setChangedValue] = useState<Value | typeof unsetValue>(unsetValue);

  const value = changedValue !== unsetValue ? changedValue : initialValue;

  const updateValue = useCallback<ValueUpdater<Value>>(
    (updater) =>
      setChangedValue((previousValue) =>
        previousValue === unsetValue ? updater(initialValue) : updater(previousValue)
      ),
    [initialValue]
  );

  const resetValue = useCallback(() => setChangedValue(unsetValue), []);

  const isDirty = useMemo(() => !equal(value, initialValue), [value, initialValue]);

  const validity = useValidity(value, validate);

  return useMemo(
    () => ({
      initialValue,
      isDirty,
      resetValue,
      updateValue,
      validity,
      value,
    }),
    [initialValue, isDirty, resetValue, updateValue, validity, value]
  );
};

export const useCompositeFormElement = <FormValues extends {}, InvalidReason>({
  childFormElements,
  validate,
}: {
  childFormElements: FormElementMap<FormValues>;
  validate?: (values: FormValues) => Promise<InvalidReason[]>;
}): CompositeFormElement<FormValues, InvalidReason> => {
  const childFormElementEntries = useMemo(
    () => Object.entries(childFormElements) as ObjectEntries<typeof childFormElements>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Object.entries(childFormElements).flat()
  );

  const value = useMemo(
    () =>
      childFormElementEntries.reduce<FormValues>(
        (accumulatedFormValues, [formElementName, formElement]) => ({
          ...accumulatedFormValues,
          [formElementName]: formElement.value,
        }),
        {} as FormValues
      ),
    [childFormElementEntries]
  );

  const updateValue = useCallback(
    (updater: (previousValues: FormValues) => FormValues) => {
      const newValues = updater(value);

      childFormElementEntries.forEach(([formElementName, formElement]) =>
        formElement.updateValue(() => newValues[formElementName])
      );
    },
    [childFormElementEntries, value]
  );

  const isDirty = useMemo(
    () => childFormElementEntries.some(([, formElement]) => formElement.isDirty),
    [childFormElementEntries]
  );

  const formValidity = useValidity(value, validate);
  const childFormElementsValidity = useMemo<
    FormElementValidity<InvalidReason | ChildFormValidationError>
  >(() => {
    if (
      childFormElementEntries.some(([, formElement]) => formElement.validity.validity === 'invalid')
    ) {
      return {
        validity: 'invalid',
        reasons: [{ type: 'child' }],
      };
    } else if (
      childFormElementEntries.some(([, formElement]) => formElement.validity.validity === 'pending')
    ) {
      return {
        validity: 'pending',
      };
    } else {
      return {
        validity: 'valid',
      };
    }
  }, [childFormElementEntries]);

  const validity = useMemo(
    () => getCombinedValidity(formValidity, childFormElementsValidity),
    [formValidity, childFormElementsValidity]
  );

  const resetValue = useCallback(() => {
    childFormElementEntries.forEach(([, formElement]) => formElement.resetValue());
  }, [childFormElementEntries]);

  const initialValue = useMemo(
    () =>
      childFormElementEntries.reduce<FormValues>(
        (accumulatedFormValues, [formElementName, formElement]) => ({
          ...accumulatedFormValues,
          [formElementName]: formElement.initialValue,
        }),
        {} as FormValues
      ),
    [childFormElementEntries]
  );

  return useMemo(
    () => ({
      childFormElements,
      initialValue,
      isDirty,
      resetValue,
      updateValue,
      validity,
      value,
    }),
    [childFormElements, initialValue, isDirty, resetValue, updateValue, validity, value]
  );
};

const useValidity = <Value, InvalidReason>(
  value: Value,
  validate?: (value: Value) => Promise<InvalidReason[]>
) => {
  const validationState = useAsync(
    () => validate?.(value) ?? Promise.resolve([]),
    [validate, value]
  );

  const validity = useMemo<FormElementValidity<InvalidReason | GenericValidationError>>(() => {
    if (validationState.loading) {
      return { validity: 'pending' as const };
    } else if (validationState.error != null) {
      return {
        validity: 'invalid' as const,
        reasons: [
          {
            type: 'generic' as const,
            message: `${validationState.error}`,
          },
        ],
      };
    } else if (validationState.value && validationState.value.length > 0) {
      return {
        validity: 'invalid' as const,
        reasons: validationState.value,
      };
    } else {
      return {
        validity: 'valid' as const,
      };
    }
  }, [validationState.error, validationState.loading, validationState.value]);

  return validity;
};

export const getCombinedValidity = <FirstInvalidReason, SecondInvalidReason>(
  first: FormElementValidity<FirstInvalidReason>,
  second: FormElementValidity<SecondInvalidReason>
): FormElementValidity<FirstInvalidReason | SecondInvalidReason> => {
  if (first.validity === 'invalid' || second.validity === 'invalid') {
    return {
      validity: 'invalid',
      reasons: [
        ...(first.validity === 'invalid' ? first.reasons : []),
        ...(second.validity === 'invalid' ? second.reasons : []),
      ],
    };
  } else if (first.validity === 'pending' || second.validity === 'pending') {
    return {
      validity: 'pending',
    };
  } else {
    return {
      validity: 'valid',
    };
  }
};

export const isFormElementForType =
  <Value extends any>(isValue: (value: any) => value is Value) =>
  <InvalidReason extends unknown>(
    formElement: FormElement<any, InvalidReason>
  ): formElement is FormElement<Value, InvalidReason> =>
    isValue(formElement.value);
