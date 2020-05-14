/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { Datasource } from '../../../types';
import { useGetOneAgentConfig } from '../../../hooks';
import { PackageIcon } from '../../../components/package_icon';

interface Props {
  agentConfigId: string;
}

export const AgentConfigDatasourceBadges: React.FunctionComponent<Props> = ({ agentConfigId }) => {
  const agentConfigRequest = useGetOneAgentConfig(agentConfigId);
  const agentConfig = agentConfigRequest.data ? agentConfigRequest.data.item : null;

  if (!agentConfig) {
    return null;
  }
  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.agentReassignConfig.configDescription"
          defaultMessage="The selected agent configuration will collect data for {count, plural, one {{countValue} data source} other {{countValue} data sources}}:"
          values={{
            count: agentConfig.datasources.length,
            countValue: <b>{agentConfig.datasources.length}</b>,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      {(agentConfig.datasources as Datasource[]).map((datasource, idx) => {
        if (!datasource.package) {
          return null;
        }
        return (
          <EuiBadge key={idx} color="hollow">
            <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <PackageIcon
                  packageName={datasource.package.name}
                  version={datasource.package.version}
                  size="s"
                  tryApi={true}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{datasource.package.title}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        );
      })}
    </>
  );
};
