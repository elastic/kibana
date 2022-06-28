/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBasicTableColumn,
  EuiSpacer,
  EuiTableActionsColumnType,
  EuiTitle,
  EuiToolTip,
  PropsOf,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { ColumnNameWithTooltip } from '../../../components/column_name_with_tooltip';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import { CspFinding } from '../types';

export const PageWrapper: React.FC = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: ${euiTheme.size.l};
      `}
    >
      {children}
    </div>
  );
};

export const PageTitle: React.FC = ({ children }) => (
  <EuiTitle size="l">
    <div>
      {children}
      <EuiSpacer />
    </div>
  </EuiTitle>
);

export const PageTitleText = ({ title }: { title: React.ReactNode }) => <h2>{title}</h2>;

export const getExpandColumn = <T extends unknown>({
  onClick,
}: {
  onClick(item: T): void;
}): EuiTableActionsColumnType<T> => ({
  width: '40px',
  actions: [
    {
      name: i18n.translate('xpack.csp.expandColumnNameLabel', { defaultMessage: 'Expand' }),
      description: i18n.translate('xpack.csp.expandColumnDescriptionLabel', {
        defaultMessage: 'Expand',
      }),
      type: 'icon',
      icon: 'expand',
      onClick,
    },
  ],
});

export const getFindingsColumns = (): Array<EuiBasicTableColumn<CspFinding>> => [
  {
    field: 'resource.id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnLabel',
          { defaultMessage: 'Resource ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnTooltipLabel',
          { defaultMessage: 'Custom Elastic Resource ID' }
        )}
      />
    ),
    truncateText: true,
    width: '15%',
    sortable: true,
    render: (filename: string) => (
      <EuiToolTip position="top" content={filename}>
        <span>{filename}</span>
      </EuiToolTip>
    ),
  },
  {
    field: 'result.evaluation',
    name: i18n.translate('xpack.csp.findings.findingsTable.findingsTableColumn.resultColumnLabel', {
      defaultMessage: 'Result',
    }),
    width: '100px',
    sortable: true,
    render: (type: PropsOf<typeof CspEvaluationBadge>['type']) => (
      <CspEvaluationBadge type={type} />
    ),
  },
  {
    field: 'resource.sub_type',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.resourceTypeColumnLabel',
      { defaultMessage: 'Resource Type' }
    ),
    sortable: true,
    width: '150px',
  },
  {
    field: 'resource.name',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.resourceNameColumnLabel',
      { defaultMessage: 'Resource Name' }
    ),
    sortable: true,
  },
  {
    field: 'rule.name',
    name: i18n.translate('xpack.csp.findings.findingsTable.findingsTableColumn.ruleColumnLabel', {
      defaultMessage: 'Rule',
    }),
    sortable: true,
  },
  {
    field: 'rule.section',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.ruleSectionColumnLabel',
      { defaultMessage: 'CIS Section' }
    ),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'cluster_id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnLabel',
          { defaultMessage: 'Cluster ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnTooltipLabel',
          { defaultMessage: 'Kube-System Namespace ID' }
        )}
      />
    ),
    truncateText: true,
    sortable: true,
  },
  {
    field: '@timestamp',
    width: '150px',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.lastCheckedColumnLabel',
      { defaultMessage: 'Last Checked' }
    ),
    truncateText: true,
    sortable: true,
    render: (timestamp: number) => (
      <EuiToolTip position="top" content={timestamp}>
        <span>{moment(timestamp).fromNow()}</span>
      </EuiToolTip>
    ),
  },
];
