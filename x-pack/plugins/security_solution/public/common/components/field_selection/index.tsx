/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { StackByComboBox } from '../../../detections/components/alerts_kpis/common/components';
import {
  GROUP_BY_LABEL,
  GROUP_BY_TOP_LABEL,
} from '../../../detections/components/alerts_kpis/common/translations';

const ChartOptionsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export interface Props {
  chartOptionsContextMenu?: (queryId: string) => React.ReactNode;
  setStackByField0: (stackBy: string) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  stackByField0: string;
  stackByField1: string | undefined;
  stackByWidth?: number;
  uniqueQueryId: string;
}

const FieldSelectionComponent: React.FC<Props> = ({
  chartOptionsContextMenu,
  setStackByField0,
  setStackByField1,
  stackByField0,
  stackByField1,
  stackByWidth,
  uniqueQueryId,
}: Props) => (
  <EuiFlexGroup alignItems="flexStart" data-test-subj="fieldSelection" gutterSize="none">
    <EuiFlexItem grow={false}>
      <StackByComboBox
        onSelect={setStackByField0}
        prepend={GROUP_BY_LABEL}
        selected={stackByField0}
        width={stackByWidth}
      />
      <EuiSpacer size="s" />
      <StackByComboBox
        onSelect={setStackByField1}
        prepend={GROUP_BY_TOP_LABEL}
        selected={stackByField1 ?? ''}
        width={stackByWidth}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      {chartOptionsContextMenu != null && (
        <ChartOptionsFlexItem grow={false}>
          {chartOptionsContextMenu(uniqueQueryId)}
        </ChartOptionsFlexItem>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);

FieldSelectionComponent.displayName = 'FieldSelectionComponent';

export const FieldSelection = React.memo(FieldSelectionComponent);
