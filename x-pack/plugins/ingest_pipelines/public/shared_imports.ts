/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useKibana as _useKibana, CodeEditor } from '../../../../src/plugins/kibana_react/public';
import { AppServices } from './application';

export { CodeEditor };

export {
  AuthorizationProvider,
  Error,
  NotAuthorizedSection,
  SectionError,
  SectionLoading,
  sendRequest,
  SendRequestConfig,
  SendRequestResponse,
  useAuthorizationContext,
  useRequest,
  UseRequestConfig,
  WithPrivileges,
  Monaco,
  JsonEditor,
  OnJsonEditorUpdateHandler,
} from '../../../../src/plugins/es_ui_shared/public/';

export {
  FormSchema,
  FIELD_TYPES,
  FormConfig,
  useForm,
  Form,
  getUseField,
  ValidationFuncArg,
  FormData,
  UseField,
  FormHook,
  useFormContext,
  FormDataProvider,
  OnFormUpdateArg,
  FieldConfig,
  FieldHook,
  getFieldValidityAndErrorMessage,
} from '../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

export {
  fieldFormatters,
  fieldValidators,
} from '../../../../src/plugins/es_ui_shared/static/forms/helpers';

export {
  getFormRow,
  Field,
  JsonEditorField,
  FormRow,
  ToggleField,
  ComboBoxField,
} from '../../../../src/plugins/es_ui_shared/static/forms/components';

export {
  isJSON,
  isEmptyString,
} from '../../../../src/plugins/es_ui_shared/static/validators/string';

export const useKibana = () => _useKibana<AppServices>();
