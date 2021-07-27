/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiBadge,
  EuiLink,
  SearchFilterConfig,
} from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../common/types';
import { DEPRECATION_TYPE_MAP } from '../constants';

const i18nTexts = {
  typeColumnTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeColumnTitle', {
    defaultMessage: 'Type',
  }),
  sourceColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.sourceColumnTitle',
    {
      defaultMessage: 'Source',
    }
  ),
  issueColumnTitle: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.issueColumnTitle', {
    defaultMessage: 'Issue',
  }),
  statusColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.statusColumnTitle',
    {
      defaultMessage: 'Status',
    }
  ),
  criticalBadgeLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.criticalBadgeLabel',
    {
      defaultMessage: 'critical',
    }
  ),
  refreshButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
    }
  ),
  noDeprecationsMessage: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.noDeprecationsMessage',
    {
      defaultMessage: 'No Elasticsearch deprecations found',
    }
  ),
  typeFilterLabel: i18n.translate('xpack.upgradeAssistant.esDeprecations.table.typeFilterLabel', {
    defaultMessage: 'Type',
  }),
  criticalFilterLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.table.criticalFilterLabel',
    {
      defaultMessage: 'Critical',
    }
  ),
};

interface Props {
  deprecations?: EnrichedDeprecationInfo[];
  reload: () => void;
}

export const EsDeprecationsTable: React.FunctionComponent<Props> = ({ deprecations, reload }) => {
  const columns: Array<EuiBasicTableColumn<EnrichedDeprecationInfo>> = [
    {
      field: 'type',
      name: i18nTexts.typeColumnTitle,
      truncateText: true,
      sortable: true,
      render: (type: 'cluster_settings' | 'index_settings' | 'node_settings' | 'ml_settings') =>
        DEPRECATION_TYPE_MAP[type],
    },
    {
      field: 'index',
      name: i18nTexts.sourceColumnTitle,
      truncateText: true,
      sortable: true,
    },
    {
      field: 'message',
      name: i18nTexts.issueColumnTitle,
      truncateText: true,
      sortable: true,
      // TODO handle onClick
      render: (message: string) => <EuiLink href="#">{message}</EuiLink>,
    },
    {
      field: 'isCritical',
      name: i18nTexts.statusColumnTitle,
      truncateText: true,
      sortable: true,
      render: (isCritical: boolean) => {
        if (isCritical) {
          return <EuiBadge color="danger">{i18nTexts.criticalBadgeLabel}</EuiBadge>;
        }
        return null;
      },
    },
  ];

  const pagination = {
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50],
  };

  const searchConfig = {
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'is',
        field: 'isCritical',
        name: i18nTexts.criticalFilterLabel,
      },
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18nTexts.typeFilterLabel,
        multiSelect: false,
        options: (Object.keys(DEPRECATION_TYPE_MAP) as Array<
          keyof typeof DEPRECATION_TYPE_MAP
        >).map((type) => ({
          value: type,
          name: DEPRECATION_TYPE_MAP[type],
        })),
      },
    ] as SearchFilterConfig[],
    toolsRight: [
      <EuiButton
        iconType="refresh"
        onClick={reload}
        data-test-subj="reloadButton"
        key="reloadButton"
      >
        {i18nTexts.refreshButtonLabel}
      </EuiButton>,
    ],
  };

  return (
    <EuiInMemoryTable
      items={deprecations || []}
      itemId="name"
      columns={columns}
      search={searchConfig}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="esDeprecationsTable"
      message={i18nTexts.noDeprecationsMessage}
      tableLayout="auto"
    />
  );
};
