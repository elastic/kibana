/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBox } from '@elastic/eui';
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
  setStackByField0ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  setStackByField1: (stackBy: string | undefined) => void;
  setStackByField1ComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  stackByField0: string;
  stackByField0ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  stackByField1: string | undefined;
  stackByField1ComboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  stackByWidth?: number;
  uniqueQueryId: string;
}

const FieldSelectionComponent: React.FC<Props> = ({
  chartOptionsContextMenu,
  setStackByField0,
  setStackByField0ComboboxInputRef,
  setStackByField1,
  setStackByField1ComboboxInputRef,
  stackByField0,
  stackByField0ComboboxRef,
  stackByField1,
  stackByField1ComboboxRef,
  stackByWidth,
  uniqueQueryId,
}: Props) => (
  <EuiFlexGroup alignItems="flexStart" data-test-subj="fieldSelection" gutterSize="none">
    <EuiFlexItem grow={false}>
      <StackByComboBox
        aria-label={GROUP_BY_LABEL}
        ref={stackByField0ComboboxRef}
        data-test-subj="groupBy"
        onSelect={setStackByField0}
        prepend={GROUP_BY_LABEL}
        selected={stackByField0}
        inputRef={setStackByField0ComboboxInputRef}
        width={stackByWidth}
      />
      <EuiSpacer size="s" />
      <StackByComboBox
        aria-label={GROUP_BY_TOP_LABEL}
        ref={stackByField1ComboboxRef}
        data-test-subj="groupByTop"
        onSelect={setStackByField1}
        prepend={GROUP_BY_TOP_LABEL}
        selected={stackByField1 ?? ''}
        inputRef={setStackByField1ComboboxInputRef}
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
