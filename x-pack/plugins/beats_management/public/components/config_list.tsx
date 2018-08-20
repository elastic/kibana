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
}

export const ConfigList: React.SFC<ComponentProps> = props => (
  <EuiBasicTable
    items={props.configs.map(config => {
      const type = supportedConfigs.find((sc: any) => sc.value === config.type);
      return {
        ...config,
        block_obj: { ...config.block_obj, module: (config.block_obj as any).module || 'N/A' },
        type: type ? type.text : config.type,
      };
    })}
    columns={[
      {
        field: 'type',
        name: 'Type',
        truncateText: false,
        hideForMobile: false,
      },
      {
        field: 'block_obj.module',
        name: 'Module',
        truncateText: false,
        hideForMobile: true,
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
            onClick: () => '',
          },
        ],
      },
    ]}
  />
);
