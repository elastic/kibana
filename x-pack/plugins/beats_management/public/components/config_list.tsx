/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { ConfigurationBlock } from '../../common/domain_types';
import { supportedConfigs } from '../config_schemas';

interface ComponentProps {
  configs: ConfigurationBlock[];
  onConfigClick: (action: 'edit' | 'delete', config: ConfigurationBlock) => any;
  intl: InjectedIntl;
}

const ConfigListUI: React.SFC<ComponentProps> = props => (
  <EuiBasicTable
    items={props.configs || []}
    columns={[
      {
        field: 'type',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tag.configListTypeColumnName',
          defaultMessage: 'Type',
        }),
        truncateText: false,
        render: (value: string, config: ConfigurationBlock) => {
          const type = supportedConfigs.find((sc: any) => sc.value === config.type);

          return (
            <EuiLink onClick={() => props.onConfigClick('edit', config)}>
              {type ? type.text : config.type}
            </EuiLink>
          );
        },
      },
      {
        field: 'module',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tag.configListModuleColumnName',
          defaultMessage: 'Module',
        }),
        truncateText: false,
        render: (value: string) => {
          return value || 'N/A';
        },
      },
      {
        field: 'description',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tag.configListDescriptionColumnName',
          defaultMessage: 'Description',
        }),
      },
      {
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tag.configListActionsColumnName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: props.intl.formatMessage({
              id: 'xpack.beatsManagement.tag.configListRemoveColumnName',
              defaultMessage: 'Remove',
            }),
            description: props.intl.formatMessage({
              id: 'xpack.beatsManagement.tag.configListRemoveDescription',
              defaultMessage: 'Remove this config from tag',
            }),
            type: 'icon',
            icon: 'trash',
            onClick: (item: ConfigurationBlock) => props.onConfigClick('delete', item),
          },
        ],
      },
    ]}
  />
);

export const ConfigList = injectI18n(ConfigListUI);
