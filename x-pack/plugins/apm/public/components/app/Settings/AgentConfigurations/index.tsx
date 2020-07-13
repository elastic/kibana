/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useFetcher } from '../../../../hooks/useFetcher';
import { AgentConfigurationList } from './List';
import { useTrackPageview } from '../../../../../../observability/public';
import { createAgentConfigurationHref } from '../../../shared/Links/apm/agentConfigurationLinks';

export function AgentConfigurations() {
  const { refetch, data = [], status } = useFetcher(
    (callApmApi) =>
      callApmApi({ pathname: '/api/apm/settings/agent-configuration' }),
    [],
    { preservePreviousData: false, showToastOnError: false }
  );

  useTrackPageview({ app: 'apm', path: 'agent_configuration' });
  useTrackPageview({ app: 'apm', path: 'agent_configuration', delay: 15000 });

  const hasConfigurations = !isEmpty(data);

  return (
    <>
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.apm.agentConfig.configurationsPanelTitle',
                  { defaultMessage: 'Agent remote configuration' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {hasConfigurations ? <CreateConfigurationButton /> : null}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <AgentConfigurationList status={status} data={data} refetch={refetch} />
      </EuiPanel>
    </>
  );
}

function CreateConfigurationButton() {
  const href = createAgentConfigurationHref();
  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" fill iconType="plusInCircle" href={href}>
            {i18n.translate('xpack.apm.agentConfig.createConfigButtonLabel', {
              defaultMessage: 'Create configuration',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
