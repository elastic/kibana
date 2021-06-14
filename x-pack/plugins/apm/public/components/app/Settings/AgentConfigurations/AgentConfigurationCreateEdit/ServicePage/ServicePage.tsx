/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { isString } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import {
  omitAllOption,
  getOptionLabel,
} from '../../../../../../../common/agent_configuration/all_option';
import { useFetcher, FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import { FormRowSelect } from './FormRowSelect';
import { APMLink } from '../../../../../shared/Links/apm/APMLink';

interface Props {
  newConfig: AgentConfigurationIntake;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  onClickNext: () => void;
}

export function ServicePage({ newConfig, setNewConfig, onClickNext }: Props) {
  const { data: serviceNamesData, status: serviceNamesStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/settings/agent-configuration/services',
        isCachable: true,
      });
    },
    [],
    { preservePreviousData: false }
  );
  const serviceNames = serviceNamesData?.serviceNames ?? [];

  const { data: environmentsData, status: environmentsStatus } = useFetcher(
    (callApmApi) => {
      if (newConfig.service.name) {
        return callApmApi({
          endpoint: 'GET /api/apm/settings/agent-configuration/environments',
          params: {
            query: { serviceName: omitAllOption(newConfig.service.name) },
          },
        });
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

      const { agentName } = await callApmApi({
        endpoint: 'GET /api/apm/settings/agent-configuration/agent_name',
        params: { query: { serviceName } },
      });

      setNewConfig((prev) => ({ ...prev, agent_name: agentName }));
    },
    [newConfig.service.name, setNewConfig]
  );

  const ALREADY_CONFIGURED_TRANSLATED = i18n.translate(
    'xpack.apm.agentConfig.servicePage.alreadyConfiguredOption',
    { defaultMessage: 'already configured' }
  );

  const serviceNameOptions = serviceNames.map((name) => ({
    text: getOptionLabel(name),
    value: name,
  }));
  const environmentOptions = environments.map(
    ({ name, alreadyConfigured }) => ({
      disabled: alreadyConfigured,
      text: `${getOptionLabel(name)} ${
        alreadyConfigured ? `(${ALREADY_CONFIGURED_TRANSLATED})` : ''
      }`,
      value: name,
    })
  );

  return (
    <>
      {/* Service name options */}
      <FormRowSelect
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
        isLoading={serviceNamesStatus === FETCH_STATUS.LOADING}
        options={serviceNameOptions}
        value={newConfig.service.name}
        disabled={serviceNamesStatus === FETCH_STATUS.LOADING}
        onChange={(e) => {
          e.preventDefault();
          const name = e.target.value;
          setNewConfig((prev) => ({
            ...prev,
            service: { name, environment: '' },
          }));
        }}
      />

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
        disabled={
          !newConfig.service.name || environmentsStatus === FETCH_STATUS.LOADING
        }
        onChange={(e) => {
          e.preventDefault();
          const environment = e.target.value;
          setNewConfig((prev) => ({
            ...prev,
            service: { name: prev.service.name, environment },
          }));
        }}
      />

      <EuiSpacer />

      <EuiFlexGroup justifyContent="flexEnd">
        {/* Cancel button */}
        <EuiFlexItem grow={false}>
          <APMLink path="/settings/agent-configuration">
            <EuiButtonEmpty color="primary">
              {i18n.translate(
                'xpack.apm.agentConfig.servicePage.cancelButton',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </APMLink>
        </EuiFlexItem>

        {/* Next button */}
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            fill
            onClick={onClickNext}
            isLoading={agentNameStatus === FETCH_STATUS.LOADING}
            isDisabled={
              !newConfig.service.name ||
              !newConfig.service.environment ||
              agentNameStatus === FETCH_STATUS.LOADING
            }
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
