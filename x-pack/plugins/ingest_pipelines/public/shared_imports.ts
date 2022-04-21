/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana as _useKibana, CodeEditor } from '@kbn/kibana-react-plugin/public';
import { AppServices } from './application';

export { CodeEditor };

export type {
  Error,
  SendRequestConfig,
  SendRequestResponse,
  UseRequestConfig,
  OnJsonEditorUpdateHandler,
} from '@kbn/es-ui-shared-plugin/public';

export {
  AuthorizationProvider,
  NotAuthorizedSection,
  SectionError,
  SectionLoading,
  sendRequest,
  useAuthorizationContext,
  useRequest,
  WithPrivileges,
  XJson,
  JsonEditor,
  attemptToURIDecode,
  ViewApiRequestFlyout,
} from '@kbn/es-ui-shared-plugin/public';

export type {
  FormSchema,
  FormConfig,
  ValidationFuncArg,
  FormData,
  ArrayItem,
  FormHook,
  OnFormUpdateArg,
  FieldConfig,
  FieldHook,
  ValidationFunc,
  ValidationConfig,
  FormOptions,
  SerializerFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export {
  FIELD_TYPES,
  useForm,
  Form,
  getUseField,
  UseField,
  UseArray,
  useFormContext,
  UseMultiFields,
  FormDataProvider,
  getFieldValidityAndErrorMessage,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export { fieldFormatters, fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

export {
  getFormRow,
  Field,
  JsonEditorField,
  FormRow,
  ToggleField,
  ComboBoxField,
  RadioGroupField,
  NumericField,
  SelectField,
  CheckBoxField,
  TextField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

export { isJSON, isEmptyString } from '@kbn/es-ui-shared-plugin/static/validators/string';

export {
  KibanaContextProvider,
  KibanaThemeProvider,
  useExecutionContext,
} from '@kbn/kibana-react-plugin/public';

export const useKibana = () => _useKibana<AppServices>();
