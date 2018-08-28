/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import React from 'react';
import { supportedConfigs } from '../config_schemas';
import { ClientSideConfigurationBlock } from '../lib/lib';

interface ComponentProps {
  configs: ClientSideConfigurationBlock[];
  onConfigClick: (action: 'edit' | 'delete', config: ClientSideConfigurationBlock) => any;
}

export const ConfigList: React.SFC<ComponentProps> = props => (
  <EuiBasicTable
    items={props.configs}
    columns={[
      {
        field: 'type',
        name: 'Type',
        truncateText: false,
        render: (value: string, config: ClientSideConfigurationBlock) => {
          const type = supportedConfigs.find((sc: any) => sc.value === config.type);

          return (
            <EuiLink onClick={() => props.onConfigClick('edit', config)}>
              {type ? type.text : config.type}
            </EuiLink>
          );
        },
      },
      {
        field: 'block_obj.module',
        name: 'Module',
        truncateText: false,
        render: (value: string) => {
          return value || 'N/A';
        },
      },
      {
        field: 'description',
        name: 'Description',
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Remove',
            description: 'Remove this config from tag',
            type: 'icon',
            icon: 'trash',
            onClick: (item: ClientSideConfigurationBlock) => props.onConfigClick('delete', item),
          },
        ],
      },
    ]}
  />
);
