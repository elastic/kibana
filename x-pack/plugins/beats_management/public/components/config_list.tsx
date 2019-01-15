/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { configBlockSchemas } from '../../common/config_schemas';
import { translateConfigSchema } from '../../common/config_schemas_translations_map';
import { TABLE_CONFIG } from '../../common/constants/table';
import { ConfigurationBlock } from '../../common/domain_types';

interface ComponentProps {
  configs: ConfigurationBlock[];
  onConfigClick: (action: 'edit' | 'delete', config: ConfigurationBlock) => any;
  onTableChange: (index: number, size: number) => void;
  intl: InjectedIntl;
}
const pagination = {
  initialPageSize: TABLE_CONFIG.INITIAL_ROW_SIZE,
  pageSizeOptions: TABLE_CONFIG.PAGE_SIZE_OPTIONS,
};

const ConfigListUi: React.SFC<ComponentProps> = props => (
  <EuiBasicTable
    items={props.configs || []}
    pagination={{ ...pagination, totalItemCount: 10000 }}
    onChange={(page: { index: number; size: number } = { index: 0, size: 50 }) => {
      if (props.onTableChange) {
        props.onTableChange(page.index, page.size);
      }
    }}
    columns={[
      {
        field: 'type',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tagTable.typeColumnName',
          defaultMessage: 'Type',
        }),
        truncateText: false,
        render: (type: string, config: ConfigurationBlock) => {
          const translatedConfig = translateConfigSchema(configBlockSchemas).find(
            sc => sc.id === type
          );

          return (
            <EuiLink onClick={() => props.onConfigClick('edit', config)}>
              {translatedConfig ? translatedConfig.name : type}
            </EuiLink>
          );
        },
      },
      {
        field: 'module',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tagTable.moduleColumnName',
          defaultMessage: 'Module',
        }),
        truncateText: false,
        render: (value: string) => {
          return (
            value ||
            props.intl.formatMessage({
              id: 'xpack.beatsManagement.tagTable.moduleColumn.notAvailibaleLabel',
              defaultMessage: 'N/A',
            })
          );
        },
      },
      {
        field: 'description',
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tagTable.descriptionColumnName',
          defaultMessage: 'Description',
        }),
      },
      {
        name: props.intl.formatMessage({
          id: 'xpack.beatsManagement.tagTable.actionsColumnName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: props.intl.formatMessage({
              id: 'xpack.beatsManagement.tagTable.actions.removeButtonAriaLabel',
              defaultMessage: 'Remove',
            }),
            description: props.intl.formatMessage({
              id: 'xpack.beatsManagement.tagTable.actions.removeTooltip',
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

export const ConfigList = injectI18n(ConfigListUi);
