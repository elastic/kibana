/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  useState,
  useEffect,
  DependencyList,
  FocusEventHandler,
  ChangeEventHandler,
  ReactEventHandler,
} from 'react';
import { useAsyncFn } from 'react-use';

export interface FormOptions<Values, Result> extends SubmitHandlerOptions<Result> {
  validate: ValidateFunction<Values>;
  defaultValues?: Partial<Values>;
}

export interface FormProps {
  onSubmit: ReactEventHandler;
  onChange: ChangeEventHandler<HTMLFormElement>;
  onBlur: FocusEventHandler<HTMLFormElement>;
  noValidate: boolean;
}

export type FormReturnTuple<Values, Result> = [
  ValidationState<Values> & SubmitState<Result>,
  FormProps
];

/**
 * Returns state and {@link HTMLFormElement} event handlers useful for creating
 * forms with inline validation.
 *
 * @see {@link useInlineValidation} if you don't want to use {@link HTMLFormElement}.
 * @see {@link useSubmitHandler} if you don't require inline validation.
 *
 * @example
 * ```typescript
 * const [form, eventHandlers] = useForm({
 *   onSubmit: (values) => apiClient.create(values),
 *   validate: (values) => !values.email ? { email: 'Required' } : {}
 * });
 *
 * <EuiForm component="form" error={Object.values(form.errors)} {...eventHandlers}>
 *   <EuiFieldText name="email" />
 *   <EuiButton type="submit">Submit</EuiButton>
 * <EuiForm>
 * ```
 */
export function useForm<Values, Result>(
  options: FormOptions<Values, Result>,
  deps?: DependencyList
): FormReturnTuple<Values, Result> {
  const [submitState, submit] = useSubmitHandler(options, deps);
  const validationState = useInlineValidation(options.validate, options.defaultValues);

  const eventHandlers: FormProps = {
    onSubmit: (event) => {
      event.preventDefault();
      validationState.handleSubmit(submit);
    },
    onChange: (event) => {
      const { name, type, checked, value } = event.target;
      validationState.setValue(name, type === 'checkbox' ? checked : value);
    },
    onBlur: (event) => {
      validationState.trigger(event.target.name);
    },
    noValidate: true, // Native browser validation gets in the way of EUI
  };

  return [{ ...validationState, ...submitState }, eventHandlers];
}

export type ValidateFunction<Values> = (values: Partial<Values>) => ValidationErrors<Values>;
export type ValidationErrors<Values> = Partial<Record<keyof Values, string>>;
export type DirtyFields<Values> = Partial<Record<keyof Values, any>>;
export type SubmitCallback<Values, Result> = (values: Values) => Promise<Result>;

export interface ValidationState<Values> {
  setValue(name: string, value: any): void;
  setError(name: string, message: string): void;
  trigger(name: string): void;
  handleSubmit<Result>(onSubmit: SubmitCallback<Values, Result>): Promise<Result | undefined>;
  values: Partial<Values>;
  errors: ValidationErrors<Values>;
  isInvalid: boolean;
  isSubmitted: boolean;
}

/**
 * Returns state useful for creating forms with inline validation.
 *
 * @example
 * ```typescript
 * const form = useInlineValidation((values) => !values.toggle ? { toggle: 'Required' } : {});
 *
 * <EuiSwitch
 *   checked={form.values.toggle}
 *   onChange={(e) => form.setValue('toggle', e.target.checked)}
 *   onBlur={() => form.trigger('toggle')}
 *   isInvalid={!!form.errors.toggle}
 * />
 * <EuiButton onClick={form.handleSubmit((values) => apiClient.create(values))}>
 *   Submit
 * </EuiButton>
 * ```
 */
export function useInlineValidation<Values>(
  validate: ValidateFunction<Values>,
  defaultValues: Partial<Values> = {}
): ValidationState<Values> {
  const [values, setValues] = useState<Partial<Values>>(defaultValues);
  const [errors, setErrors] = useState<ValidationErrors<Values>>({});
  const [dirty, setDirty] = useState<DirtyFields<Values>>({});
  const [submitCount, setSubmitCount] = useState(0);

  const isSubmitted = submitCount > 0;
  const isInvalid = Object.keys(errors).length > 0;

  const inlineValidation = (nextValues: Partial<Values>, nextDirty: DirtyFields<Values>) => {
    const nextErrors = getIntersection(validate(nextValues), nextDirty);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitCount(0);
    }
  };

  return {
    setValue: (name, value) => {
      const nextValues = { ...values, [name]: value };
      setValues(nextValues);
      inlineValidation(nextValues, dirty);
    },
    setError: (name, message) => {
      setErrors({ ...errors, [name]: message });
      setDirty({ ...dirty, [name]: true });
    },
    trigger: (name) => {
      const nextDirty = { ...dirty, [name]: true };
      setDirty(nextDirty);
      inlineValidation(values, nextDirty);
    },
    handleSubmit: async (onSubmit) => {
      const nextErrors = validate(values);
      setDirty({ ...dirty, ...nextErrors });
      setErrors(nextErrors);
      setSubmitCount(submitCount + 1);
      if (Object.keys(nextErrors).length === 0) {
        return await onSubmit(values as Values);
      }
    },
    values,
    errors,
    isInvalid,
    isSubmitted,
  };
}

export function getIntersection<Values>(
  errors: ValidationErrors<Values>,
  dirty: DirtyFields<Values>
) {
  const names = Object.keys(errors) as Array<keyof Values>;
  return names.reduce<ValidationErrors<Values>>((acc, name) => {
    if (dirty[name]) {
      acc[name] = errors[name];
    }
    return acc;
  }, {});
}

export type AsyncFunction<Result> = (...args: any[]) => Promise<Result>;

export interface SubmitHandlerOptions<Result> {
  onSubmit: AsyncFunction<Result>;
  onSubmitSuccess?: (result: Result) => void;
  onSubmitError?: (error: Error) => void;
}

export interface SubmitState<Result> {
  isSubmitting: boolean;
  submitError?: Error;
  submitResult?: Result;
}

export type SubmitHandlerReturnTuple<Result> = [SubmitState<Result>, AsyncFunction<Result>];

/**
 * Tracks state of an async function and triggers callbacks with the outcome.
 *
 * @example
 * ```typescript
 * const [state, deleteUser] = useSubmitHandler({
 *   onSubmit: () => apiClient.deleteUser(),
 *   onSubmitSuccess: (result) => toasts.addSuccess('Deleted user'),
 *   onSubmitError: (error) => toasts.addError('Could not delete user'),
 * });
 *
 * <EuiButton isLoading={state.isSubmitting} onClick={deleteUser}>
 *   Delete user
 * </EuiButton>
 * ```
 */
export function useSubmitHandler<Result>(
  { onSubmit, onSubmitSuccess, onSubmitError }: SubmitHandlerOptions<Result>,
  deps?: DependencyList
): SubmitHandlerReturnTuple<Result> {
  const [state, callback] = useAsyncFn(onSubmit, deps);

  useEffect(() => {
    if (state.value && onSubmitSuccess) {
      onSubmitSuccess(state.value);
    }
  }, [state.value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.error && onSubmitError) {
      onSubmitError(state.error);
    }
  }, [state.error]); // eslint-disable-line react-hooks/exhaustive-deps

  return [
    {
      isSubmitting: state.loading,
      submitError: state.loading ? undefined : state.error,
      submitResult: state.value,
    },
    callback,
  ];
}
