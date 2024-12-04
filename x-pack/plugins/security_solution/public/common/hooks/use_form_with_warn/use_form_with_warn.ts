/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import type { FormHook } from '../../../shared_imports';
import { useForm, type FormConfig, type FormData } from '../../../shared_imports';
import type { FormHookWithWarn } from './form_hook_with_warn';
import { extractValidationResults } from './extract_validation_results';
import type { ValidationResults } from './validation_results';

export type FormWithWarnSubmitHandler<T extends FormData = FormData> = (
  formData: T,
  isValid: boolean,
  validationResults: ValidationResults
) => Promise<void>;

interface FormWithWarnConfig<T extends FormData = FormData, I extends FormData = T>
  extends Omit<FormConfig<T, I>, 'onSubmit'> {
  onSubmit?: FormWithWarnSubmitHandler<T>;
  options: FormConfig['options'] & {
    warningValidationCodes: Readonly<string[]>;
  };
}

interface UseFormWithWarnReturn<T extends FormData = FormData, I extends FormData = T> {
  form: FormHookWithWarn<T, I>;
}

/**
 * In some cases business logic requires implementing functionality to allow users perform an action
 * despite non-critical validation errors a.k.a. warnings. Usually it's also required to inform users
 * about warnings they got before proceeding for example via a modal.
 *
 * Since `FormHook` returned by `useForm` lacks of such functionality. `useFormWithWarn` is here to
 * provide warnings functionality. Besides that it it's replaceable with `useForm`.
 */
export function useFormWithWarn<T extends FormData = FormData, I extends FormData = T>(
  formConfig: FormWithWarnConfig<T, I>
): UseFormWithWarnReturn<T, I> {
  const {
    onSubmit,
    options: { warningValidationCodes },
  } = formConfig;
  const { form } = useForm(formConfig as FormConfig<T, I>);
  const { validate: originalValidate, getFormData, getFields } = form;

  const validationResultsRef = useRef<ValidationResults>({
    errors: [],
    warnings: [],
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isValid, setIsValid] = useState<boolean>();
  const isMounted = useRef(false);

  const validate: FormHook<T, I>['validate'] = useCallback(async () => {
    await originalValidate();

    validationResultsRef.current = extractValidationResults(
      Object.values(getFields()),
      warningValidationCodes
    );

    const isFormValid = isEmpty(validationResultsRef.current.errors);

    setIsValid(isFormValid);

    return isFormValid;
  }, [originalValidate, getFields, warningValidationCodes, validationResultsRef]);

  const submit: FormHook<T, I>['submit'] = useCallback(
    async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitted(true);
      setSubmitting(true);

      const isFormValid = await validate();
      const formData = isFormValid ? getFormData() : ({} as T);

      if (onSubmit) {
        await onSubmit(formData, isFormValid, validationResultsRef.current);
      }

      if (isMounted.current) {
        setSubmitting(false);
      }

      return { data: formData, isValid: isFormValid };
    },
    [validate, getFormData, onSubmit, validationResultsRef]
  );

  // Track form's mounted state
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return useMemo(
    () => ({
      form: {
        ...form,
        isValid,
        isSubmitted,
        isSubmitting,
        validate,
        submit,
        getErrors: () => validationResultsRef.current.errors.map((x) => x.message),
        getValidationWarnings: () => validationResultsRef.current.warnings,
      },
    }),
    [form, validate, submit, isSubmitted, isSubmitting, isValid, validationResultsRef]
  );
}
