/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppServicesContext } from './types';
import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';

export {
  useForm,
  useFormData,
  Form,
  UseField,
  FieldConfig,
  OnFormUpdateArg,
  ValidationFunc,
  getFieldValidityAndErrorMessage,
  useFormContext,
  FormSchema,
  ValidationConfig,
} from '../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';

export { fieldValidators } from '../../../../src/plugins/es_ui_shared/static/forms/helpers';

export {
  ToggleField,
  NumericField,
  SelectField,
  SuperSelectField,
  ComboBoxField,
  TextField,
} from '../../../../src/plugins/es_ui_shared/static/forms/components';

export { attemptToURIDecode } from '../../../../src/plugins/es_ui_shared/public';

export { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';

export const useKibana = () => _useKibana<AppServicesContext>();
