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
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import * as TEXT from '../translations';
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
    field: 'resource_id',
    name: TEXT.RESOURCE_ID,
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
    name: TEXT.RESULT,
    width: '100px',
    sortable: true,
    render: (type: PropsOf<typeof CspEvaluationBadge>['type']) => (
      <CspEvaluationBadge type={type} />
    ),
  },
  {
    field: 'rule.name',
    name: TEXT.RULE,
    sortable: true,
  },
  {
    field: 'cluster_id',
    name: TEXT.CLUSTER_ID,
    truncateText: true,
    sortable: true,
  },
  {
    field: 'rule.section',
    name: TEXT.CIS_SECTION,
    sortable: true,
    truncateText: true,
  },
  {
    field: '@timestamp',
    width: '150px',
    name: TEXT.LAST_CHECKED,
    truncateText: true,
    sortable: true,
    render: (timestamp: number) => (
      <EuiToolTip position="top" content={timestamp}>
        <span>{moment(timestamp).fromNow()}</span>
      </EuiToolTip>
    ),
  },
];
