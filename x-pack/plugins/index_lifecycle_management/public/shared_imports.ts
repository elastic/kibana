/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppServicesContext } from './types';
import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';

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
} from '../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

export {
  useForm,
  useFormData,
  Form,
  getFieldValidityAndErrorMessage,
  useFormContext,
  UseMultiFields,
} from '../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

export { fieldValidators } from '../../../../src/plugins/es_ui_shared/static/forms/helpers';

export {
  ToggleField,
  NumericField,
  SelectField,
  SuperSelectField,
  ComboBoxField,
  TextField,
  CheckBoxField,
} from '../../../../src/plugins/es_ui_shared/static/forms/components';

export { attemptToURIDecode } from '../../../../src/plugins/es_ui_shared/public';

export {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
  useExecutionContext,
} from '../../../../src/plugins/kibana_react/public';

export { APP_WRAPPER_CLASS } from '../../../../src/core/public';

export const useKibana = () => _useKibana<AppServicesContext>();

export type { CloudSetup } from '../../cloud/public';

export type { ILicense } from '../../licensing/public';
