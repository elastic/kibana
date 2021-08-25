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
  EuiToolTip,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';

import type { DomainDeprecationDetails } from 'kibana/public';

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
  manualCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellLabel',
    {
      defaultMessage: 'Manual',
    }
  ),
  manualCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellTooltipLabel',
    {
      defaultMessage: 'Resolve this deprecation manually.',
    }
  ),
  automatedCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellLabel',
    {
      defaultMessage: 'Automated',
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
  automatedCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellTooltipLabel',
    {
      defaultMessage: 'This is an automated resolution.',
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
  deprecations?: DomainDeprecationDetails[];
  reload: () => void;
  toggleFlyout: (newFlyoutContent?: DomainDeprecationDetails) => void;
}

export const KibanaDeprecationsTable: React.FunctionComponent<Props> = ({
  deprecations,
  reload,
  toggleFlyout,
}) => {
  const columns: Array<EuiBasicTableColumn<DomainDeprecationDetails>> = [
    {
      field: 'level',
      name: i18nTexts.statusColumnTitle,
      width: '5%',
      truncateText: true,
      sortable: true,
      render: (level: DomainDeprecationDetails['level']) => {
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
        domainId: DomainDeprecationDetails['domainId'],
        deprecation: DomainDeprecationDetails
      ) => {
        return (
          <EuiLink onClick={() => toggleFlyout(deprecation)}>
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
      render: (deprecationType: DomainDeprecationDetails['deprecationType']) => {
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
      render: (correctiveActions: DomainDeprecationDetails['correctiveActions']) => {
        if (correctiveActions.api) {
          return (
            <EuiToolTip position="top" content={i18nTexts.automatedCellTooltipLabel}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="indexSettings" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{i18nTexts.automatedCellLabel}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiToolTip>
          );
        }

        return (
          <EuiToolTip position="top" content={i18nTexts.manualCellTooltipLabel}>
            <EuiText size="s" color="subdued">
              {i18nTexts.manualCellLabel}
            </EuiText>
          </EuiToolTip>
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

  const searchConfig = {
    // TODO fix
    // query: {},
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
          // TODO not working yet
          {
            value: 'unknown',
            name: i18nTexts.unknownDeprecationTypeCellLabel,
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
        // TODO implement
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
