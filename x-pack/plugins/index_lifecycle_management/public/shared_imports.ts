/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana as _useKibana } from '@kbn/kibana-react-plugin/public';
import { AppServicesContext } from './types';

export type {
  FormHook,
  FieldHook,
  FormData,
  UseFieldProps,
  FieldConfig,
  OnFormUpdateArg,
  ValidationFunc,
  FormSchema,
  ValidationConfig,
  ValidationError,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export {
  useForm,
  useFormData,
  Form,
  getFieldValidityAndErrorMessage,
  useFormContext,
  UseMultiFields,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

export {
  ToggleField,
  NumericField,
  SelectField,
  SuperSelectField,
  ComboBoxField,
  TextField,
  CheckBoxField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

export { attemptToURIDecode } from '@kbn/es-ui-shared-plugin/public';

export {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
  useExecutionContext,
} from '@kbn/kibana-react-plugin/public';

export { APP_WRAPPER_CLASS } from '@kbn/core/public';

export const useKibana = () => _useKibana<AppServicesContext>();

export type { CloudSetup } from '@kbn/cloud-plugin/public';

export type { ILicense } from '@kbn/licensing-plugin/public';
