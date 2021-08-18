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
  toggleFlyout
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
      width: '95%',
      name: i18nTexts.issueColumnTitle,
      truncateText: true,
      sortable: true,
      render: (domainId: DomainDeprecationDetails['domainId'], deprecation: DomainDeprecationDetails) => {
        return <EuiLink onClick={() => toggleFlyout(deprecation)}>{i18nTexts.getDeprecationIssue(domainId)}</EuiLink>;
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
