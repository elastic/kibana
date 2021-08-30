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
  EuiLink,
  EuiBadge,
  Search,
} from '@elastic/eui';

import type { DeprecationResolutionState, KibanaDeprecationDetails } from './kibana_deprecations';
import { ResolutionTableCell } from './resolution_table_cell';

const i18nTexts = {
  refreshButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
    }
  ),
  statusColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.statusColumnTitle',
    {
      defaultMessage: 'Status',
    }
  ),
  issueColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.issueColumnTitle',
    {
      defaultMessage: 'Issue',
    }
  ),
  typeColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.typeColumnTitle',
    {
      defaultMessage: 'Type',
    }
  ),
  resolutionColumnTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.resolutionColumnTitle',
    {
      defaultMessage: 'Resolution',
    }
  ),
  configDeprecationTypeCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.configDeprecationTypeCellLabel',
    {
      defaultMessage: 'Config',
    }
  ),
  featureDeprecationTypeCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.featureDeprecationTypeCellLabel',
    {
      defaultMessage: 'Feature',
    }
  ),
  unknownDeprecationTypeCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.unknownDeprecationTypeCellLabel',
    {
      defaultMessage: 'Unknown',
    }
  ),
  typeFilterLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.typeFilterLabel',
    {
      defaultMessage: 'Type',
    }
  ),
  getDeprecationIssue: (domainId: string) => {
    return i18n.translate('xpack.upgradeAssistant.kibanaDeprecations.table.issueCellDescription', {
      defaultMessage: '{domainId} is using a deprecated feature',
      values: {
        domainId,
      },
    });
  },
  criticalBadgeLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.criticalBadgeLabel',
    {
      defaultMessage: 'critical',
    }
  ),
  searchPlaceholderLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.searchPlaceholderLabel',
    {
      defaultMessage: 'Filter',
    }
  ),
};

interface Props {
  deprecations?: KibanaDeprecationDetails[];
  reload: () => void;
  toggleFlyout: (newFlyoutContent?: KibanaDeprecationDetails) => void;
  deprecationResolutionState?: DeprecationResolutionState;
}

export const KibanaDeprecationsTable: React.FunctionComponent<Props> = ({
  deprecations,
  reload,
  toggleFlyout,
  deprecationResolutionState,
}) => {
  const columns: Array<EuiBasicTableColumn<KibanaDeprecationDetails>> = [
    {
      field: 'level',
      name: i18nTexts.statusColumnTitle,
      width: '5%',
      truncateText: true,
      sortable: true,
      render: (level: KibanaDeprecationDetails['level']) => {
        if (level === 'critical') {
          return <EuiBadge color="danger">{i18nTexts.criticalBadgeLabel}</EuiBadge>;
        }

        return <>{''}</>;
      },
    },
    {
      field: 'domainId',
      width: '40%',
      name: i18nTexts.issueColumnTitle,
      truncateText: true,
      sortable: true,
      render: (
        domainId: KibanaDeprecationDetails['domainId'],
        deprecation: KibanaDeprecationDetails
      ) => {
        return (
          <EuiLink onClick={() => toggleFlyout(deprecation)}>
            {/* This will be replaced with a custom title once https://github.com/elastic/kibana/pull/109840 is merged  */}
            {i18nTexts.getDeprecationIssue(domainId)}
          </EuiLink>
        );
      },
    },
    {
      field: 'deprecationType',
      name: i18nTexts.typeColumnTitle,
      width: '20%',
      truncateText: true,
      sortable: true,
      render: (deprecationType: KibanaDeprecationDetails['deprecationType']) => {
        switch (deprecationType) {
          case 'config':
            return i18nTexts.configDeprecationTypeCellLabel;
          case 'feature':
            return i18nTexts.featureDeprecationTypeCellLabel;
          default:
            return i18nTexts.unknownDeprecationTypeCellLabel;
        }
      },
    },
    {
      field: 'correctiveActions',
      name: i18nTexts.resolutionColumnTitle,
      width: '30%',
      truncateText: true,
      sortable: true,
      render: (
        correctiveActions: KibanaDeprecationDetails['correctiveActions'],
        deprecation: KibanaDeprecationDetails
      ) => {
        return (
          <ResolutionTableCell
            deprecationId={deprecation.id}
            isAutomated={Boolean(correctiveActions?.api)}
            deprecationResolutionState={deprecationResolutionState}
          />
        );
      },
    },
  ];

  const pagination = {
    initialPageSize: 50,
    pageSizeOptions: [50, 100, 200],
  };

  const sorting = {
    sort: {
      field: 'level',
      direction: 'asc',
    },
  } as const;

  const searchConfig: Search = {
    filters: [
      {
        type: 'is',
        field: 'level',
        name: i18n.translate('xpack.idxMgmt.componentTemplatesList.table.isManagedFilterLabel', {
          defaultMessage: 'Critical',
        }),
      },
      {
        type: 'field_value_selection',
        field: 'deprecationType',
        name: i18nTexts.typeFilterLabel,
        multiSelect: false,
        options: [
          {
            value: 'config',
            name: i18nTexts.configDeprecationTypeCellLabel,
          },
          {
            value: 'feature',
            name: i18nTexts.featureDeprecationTypeCellLabel,
          },
        ],
      },
    ],
    box: {
      incremental: true,
      placeholder: i18nTexts.searchPlaceholderLabel,
    },
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
      sorting={sorting}
      pagination={pagination}
      rowProps={() => ({
        'data-test-subj': 'row',
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="kibanaDeprecationsTable"
      tableLayout="auto"
    />
  );
};
