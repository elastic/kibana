/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import DashboardLink from './dashboard_link';
import { HuggingFaceProviderType } from '../../../common/huggingFace/constants';
import * as i18n from './translations';
import { huggingFaceConfig, huggingFaceSecrets, providerOptions } from './constants';
const { emptyField } = fieldValidators;

const ConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, id, name }] = useFormData({
    watch: ['config.apiProvider'],
  });

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<HuggingFaceProviderType>('config.apiProvider') ??
      HuggingFaceProviderType.HuggingFace,
    [getFieldDefaultValue]
  );

  return (
    <>
      <UseField
        path="config.apiProvider"
        component={SelectField}
        config={{
          label: i18n.API_PROVIDER_LABEL,
          defaultValue: selectedProviderDefaultValue,
          validations: [
            {
              validator: emptyField(i18n.API_PROVIDER_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'config.apiProvider-select',
            options: providerOptions,
            fullWidth: true,
            hasNoInitialSelection: true,
            disabled: readOnly,
            readOnly,
          },
        }}
      />
      <EuiSpacer size="s" />
      {config != null && config.apiProvider === HuggingFaceProviderType.HuggingFace && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={huggingFaceConfig}
          secretsFormSchema={huggingFaceSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {/* {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )} */}
      {isEdit && (
        <DashboardLink
          connectorId={id}
          connectorName={name}
          selectedProvider={selectedProviderDefaultValue}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorFields as default };
