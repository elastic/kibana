/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { FieldValueSelection } from '../../../field_value_selection';
import { useIndexPatternContext } from '../../../../../hooks/use_default_index_pattern';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

interface Props {
  selectedServiceName: string | null;
  reportType: string;
  onChange: Dispatch<SetStateAction<string | null>>;
}

export const ReportDefinitionCol = ({ selectedServiceName, onChange }: Props) => {
  const { indexPattern } = useIndexPatternContext();

  return (
    <div>
      {selectedServiceName && (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} wrap>
            <EuiBadge iconSide="right" iconType="cross">
              Web App: {selectedServiceName}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      <FieldValueSelection
        sourceField="service.name"
        indexPattern={indexPattern}
        value={selectedServiceName}
        onChange={(val: string) => onChange(val)}
      />
    </div>
  );
};
