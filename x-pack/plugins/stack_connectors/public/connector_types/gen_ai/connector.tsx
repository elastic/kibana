/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { useGetDashboard } from './use_get_dashboard';
import { OpenAiProviderType } from '../../../common/gen_ai/constants';
import * as i18n from './translations';
import {
  azureAiConfig,
  azureAiSecrets,
  openAiConfig,
  openAiSecrets,
  providerOptions,
} from './constants';
const { emptyField } = fieldValidators;

const GenerativeAiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, id, name }] = useFormData({
    watch: ['config.apiProvider'],
  });

  const {
    services: {
      application: { navigateToUrl },
    },
  } = useKibana();

  const { dashboardUrl } = useGetDashboard({ connectorId: id });

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (dashboardUrl) {
        navigateToUrl(dashboardUrl);
      }
    },
    [dashboardUrl, navigateToUrl]
  );

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
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
      {config != null && config.apiProvider === OpenAiProviderType.OpenAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={openAiConfig}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
      {isEdit && dashboardUrl != null && (
        <EuiLink data-test-subj="link-gen-ai-token-dashboard" onClick={onClick}>
          {i18n.USAGE_DASHBOARD_LINK(selectedProviderDefaultValue, name)}
        </EuiLink>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GenerativeAiConnectorFields as default };
