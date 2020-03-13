/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig, Datasource } from '../../../../../../../../common/types/models';
import { NoDatasources } from './no_datasources';
import { DatasourcesTable } from '../datasources_table';
import { useCapabilities } from '../../../../../hooks';
import { useAgentConfigLink } from '../../hooks/use_details_uri';

export const ConfigDatasourcesView = memo<{ config: AgentConfig }>(({ config }) => {
  if (config.datasources.length === 0) {
    return <NoDatasources configId={config.id} />;
  }

  const hasWriteCapabilities = useCapabilities().write;
  const addDatasourceLink = useAgentConfigLink('add-datasource', { configId: config.id });

  return (
    <DatasourcesTable
      datasources={config.datasources as Datasource[]}
      search={{
        toolsRight: [
          <EuiButton
            isDisabled={!hasWriteCapabilities}
            iconType="plusInCircle"
            href={addDatasourceLink}
          >
            <FormattedMessage
              id="xpack.ingestManager.configDetails.addDatasourceButtonText"
              defaultMessage="Create data source"
            />
          </EuiButton>,
        ],
        box: {
          incremental: true,
          schema: true,
        },
      }}
      isSelectable={false}
    />
  );
});
