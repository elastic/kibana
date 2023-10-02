/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { RiskSeverity } from '../../../common/search_strategy';
import { RiskScore } from '../../explore/components/risk_score/severity/common';

import { HostDetailsLink, UserDetailsLink } from '../../common/components/links';
import { RiskScoreEntity, type RiskScore as IRiskScore } from '../../../common/risk_engine';

type RiskScoreColumn = EuiBasicTableColumn<IRiskScore> & {
  field: keyof IRiskScore;
};

export const RiskScorePreviewTable = ({
  items,
  type,
}: {
  items: IRiskScore[];
  type: RiskScoreEntity;
}) => {
  const columns: RiskScoreColumn[] = [
    {
      field: 'id_value',
      name: 'Name',
      render: (itemName: string) => {
        return type === RiskScoreEntity.host ? (
          <HostDetailsLink hostName={itemName} />
        ) : (
          <UserDetailsLink userName={itemName} />
        );
      },
    },
    {
      field: 'calculated_level',
      name: 'Level',
      render: (risk: RiskSeverity | null) => {
        if (risk != null) {
          return <RiskScore severity={risk} />;
        }

        return '';
      },
    },
    {
      field: 'calculated_score_norm',
      // align: 'right',
      name: 'Score norm',
      render: (scoreNorm: number | null) => {
        if (scoreNorm != null) {
          return Math.round(scoreNorm * 100) / 100;
        }
        return '';
      },
    },
  ];

  return (
    <EuiInMemoryTable<IRiskScore>
      data-test-subj={
        type === RiskScoreEntity.host ? 'host-risk-preview-table' : 'user-risk-preview-table'
      }
      responsive={false}
      items={items}
      columns={columns}
      loading={false}
    />
  );
};
