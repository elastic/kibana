/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { formatDate, EuiPanel, EuiSpacer, EuiInMemoryTable } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TIME_FORMAT } from '../../../../../../common/constants';
import type {
  TransformHealthIssue,
  TransformStats,
} from '../../../../../../common/types/transform_stats';
import {
  type TransformHealthStatus,
  TRANSFORM_HEALTH_STATUS,
} from '../../../../../../common/constants';

import { TransformHealthColoredDot } from './transform_health_colored_dot';

interface ExpandedRowHealthPaneProps {
  health: TransformStats['health'];
}

export const ExpandedRowHealthPane: FC<ExpandedRowHealthPaneProps> = ({ health }) => {
  const status: TransformHealthStatus = health?.status ?? TRANSFORM_HEALTH_STATUS.UNKNOWN;
  const issues = health?.issues;

  const sorting = {
    sort: {
      field: 'first_occurrence' as const,
      direction: 'desc' as const,
    },
  };

  const columns = [
    {
      field: 'first_occurrence',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.healthPane.firstOccurrenceLabel',
        {
          defaultMessage: 'First occurrence',
        }
      ),
      render: (firstOccurrence: number) => formatDate(firstOccurrence, TIME_FORMAT),
      sortable: true,
    },
    {
      field: 'count',
      name: i18n.translate('xpack.transform.transformList.transformDetails.healthPane.countLabel', {
        defaultMessage: 'count',
      }),
      sortable: true,
      width: '60px',
    },
    {
      field: 'issue',
      name: i18n.translate('xpack.transform.transformList.transformDetails.healthPane.issueLabel', {
        defaultMessage: 'Issue',
      }),
      sortable: true,
    },
    {
      field: 'details',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.healthPane.detailsLabel',
        {
          defaultMessage: 'Details',
        }
      ),
      width: '50%',
    },
  ];

  return (
    <EuiPanel
      color="transparent"
      hasBorder={false}
      paddingSize="s"
      data-test-subj="transformHealthTabContent"
    >
      <EuiSpacer size="s" />
      <TransformHealthColoredDot healthStatus={status} compact={false} />
      {Array.isArray(issues) && issues.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiInMemoryTable<TransformHealthIssue>
            data-test-subj="transformHealthTabContentIssueTable"
            items={issues}
            columns={columns}
            compressed={true}
            pagination={issues.length > 10}
            sorting={sorting}
          />
        </>
      )}
    </EuiPanel>
  );
};
