/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { isString } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import {
  omitAllOption,
  getOptionLabel,
  ALL_OPTION_VALUE,
} from '../../../../../../../common/agent_configuration/all_option';
import { useFetcher, FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import { FormRowSelect } from './form_row_select';
import { LegacyAPMLink } from '../../../../../shared/links/apm/apm_link';
import { FormRowSuggestionsSelect } from './form_row_suggestions_select';
import { SERVICE_NAME } from '../../../../../../../common/es_fields/apm';
import { isOpenTelemetryAgentName } from '../../../../../../../common/agent_name';
import { AgentName } from '../../../../../../../typings/es_schemas/ui/fields/agent';

interface Props {
  newConfig: AgentConfigurationIntake;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  onClickNext: () => void;
}

export function ServicePage({ newConfig, setNewConfig, onClickNext }: Props) {
  const { data: environmentsData, status: environmentsStatus } = useFetcher(
    (callApmApi) => {
      if (newConfig.service.name) {
        return callApmApi(
          'GET /api/apm/settings/agent-configuration/environments 2023-10-31',
          {
            params: {
              query: { serviceName: omitAllOption(newConfig.service.name) },
            },
          }
        );
      }
    },
    [newConfig.service.name],
    { preservePreviousData: false }
  );

  const environments = environmentsData?.environments ?? [];

  const { status: agentNameStatus } = useFetcher(
    async (callApmApi) => {
      const serviceName = newConfig.service.name;

      if (!isString(serviceName) || serviceName.length === 0) {
        return;
      }

      const { agentName } = await callApmApi(
        'GET /api/apm/settings/agent-configuration/agent_name 2023-10-31',
        {
          params: { query: { serviceName } },
        }
      );

      setNewConfig((prev) => ({ ...prev, agent_name: agentName }));
    },
    [newConfig.service.name, setNewConfig]
  );

  const ALREADY_CONFIGURED_TRANSLATED = i18n.translate(
    'xpack.apm.agentConfig.servicePage.alreadyConfiguredOption',
    { defaultMessage: 'already configured' }
  );

  const environmentOptions = environments.map(
    ({ name, alreadyConfigured }) => ({
      disabled: alreadyConfigured,
      label: `${getOptionLabel(name)} ${
        alreadyConfigured ? `(${ALREADY_CONFIGURED_TRANSLATED})` : ''
      }`,
      value: name,
    })
  );

  const isAgentConfigurationSupported =
    !newConfig.agent_name ||
    (newConfig.agent_name &&
      !isOpenTelemetryAgentName(newConfig.agent_name as AgentName));

  const INCORRECT_SERVICE_NAME_TRANSLATED = i18n.translate(
    'xpack.apm.settings.agentConfiguration.service.otel.error',
    {
      defaultMessage:
        'Selected service uses an OpenTelemetry agent, which is not supported',
    }
  );

  const isAllOptionSelected = newConfig.service.name === ALL_OPTION_VALUE;
  const isSaveButtonDisabled =
    !newConfig.service.name ||
    !newConfig.service.environment ||
    agentNameStatus === FETCH_STATUS.LOADING ||
    !isAgentConfigurationSupported;

  return (
    <>
      {/* Service name options */}
      <FormRowSuggestionsSelect
        title={i18n.translate(
          'xpack.apm.agentConfig.servicePage.service.title',
          { defaultMessage: 'Service' }
        )}
        description={i18n.translate(
          'xpack.apm.agentConfig.servicePage.service.description',
          { defaultMessage: 'Choose the service you want to configure.' }
        )}
        fieldLabel={i18n.translate(
          'xpack.apm.agentConfig.servicePage.service.fieldLabel',
          { defaultMessage: 'Service name' }
        )}
        fieldName={SERVICE_NAME}
        value={newConfig.service.name}
        onChange={(name) => {
          setNewConfig((prev) => ({
            ...prev,
            service: { name, environment: '' },
          }));
        }}
        dataTestSubj="serviceNameComboBox"
        isInvalid={!isAgentConfigurationSupported}
        error={INCORRECT_SERVICE_NAME_TRANSLATED}
      />
      {isAllOptionSelected && (
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={i18n.translate(
            'xpack.apm.settings.agentConfiguration.all.option.calloutTitle',
            {
              defaultMessage:
                'This configuration change will impact all services, except those that use an OpenTelemetry agent. ',
            }
          )}
        />
      )}
      {/* Environment options */}
      <FormRowSelect
        title={i18n.translate(
          'xpack.apm.agentConfig.servicePage.environment.title',
          { defaultMessage: 'Environment' }
        )}
        description={i18n.translate(
          'xpack.apm.agentConfig.servicePage.environment.description',
          {
            defaultMessage:
              'Only a single environment per configuration is supported.',
          }
        )}
        fieldLabel={i18n.translate(
          'xpack.apm.agentConfig.servicePage.environment.fieldLabel',
          { defaultMessage: 'Service environment' }
        )}
        isLoading={environmentsStatus === FETCH_STATUS.LOADING}
        options={environmentOptions}
        value={newConfig.service.environment}
        isDisabled={
          !newConfig.service.name || environmentsStatus === FETCH_STATUS.LOADING
        }
        onChange={(environment) => {
          setNewConfig((prev) => ({
            ...prev,
            service: { name: prev.service.name, environment },
          }));
        }}
        dataTestSubj="serviceEnviromentComboBox"
      />
      <EuiSpacer />
      <EuiFlexGroup justifyContent="flexEnd">
        {/* Cancel button */}
        <EuiFlexItem grow={false}>
          <LegacyAPMLink path="/settings/agent-configuration">
            <EuiButtonEmpty
              data-test-subj="apmServicePageCancelButton"
              color="primary"
            >
              {i18n.translate(
                'xpack.apm.agentConfig.servicePage.cancelButton',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </LegacyAPMLink>
        </EuiFlexItem>

        {/* Next button */}
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="apmServicePageNextStepButton"
            type="submit"
            fill
            onClick={onClickNext}
            isLoading={agentNameStatus === FETCH_STATUS.LOADING}
            isDisabled={isSaveButtonDisabled}
          >
            {i18n.translate(
              'xpack.apm.agentConfig.saveConfigurationButtonLabel',
              { defaultMessage: 'Next step' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
