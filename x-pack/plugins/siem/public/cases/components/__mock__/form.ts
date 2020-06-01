/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useForm } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);
export const mockFormHook = {
  isSubmitted: false,
  isSubmitting: false,
  isValid: true,
  submit: jest.fn(),
  subscribe: jest.fn(),
  setFieldValue: jest.fn(),
  setFieldErrors: jest.fn(),
  getFields: jest.fn(),
  getFormData: jest.fn(),
  getFieldDefaultValue: jest.fn(),
  /* Returns a list of all errors in the form */
  getErrors: jest.fn(),
  reset: jest.fn(),
  __options: {},
  __formData$: {},
  __addField: jest.fn(),
  __removeField: jest.fn(),
  __validateFields: jest.fn(),
  __updateFormDataAt: jest.fn(),
  __readFieldConfigFromSchema: jest.fn(),
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getFormMock = (sampleData: any) => ({
  ...mockFormHook,
  submit: () =>
    Promise.resolve({
      data: sampleData,
      isValid: true,
    }),
  getFormData: () => sampleData,
});

export const useFormMock = useForm as jest.Mock;
