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
import { AppDataType, ReportViewTypeId } from '../../types';

const ReportDefinitionMap: Record<
  ReportViewTypeId,
  Array<{ field: string; required?: boolean }>
> = {
  pld: [
    {
      field: 'service.name',
      required: true,
    },
  ],
  upp: [
    {
      field: 'monitor.id',
    },
  ],
  kpi: [],
  pgv: [
    {
      field: 'service.name',
      required: true,
    },
  ],
  svl: [
    {
      field: 'service.name',
      required: true,
    },
  ],
  tpt: [
    {
      field: 'service.name',
      required: true,
    },
  ],
  upd: [],
};

interface Props {
  dataType: AppDataType;
  reportType: ReportViewTypeId;
  selectedReportDefinitions: Record<string, string>;
  onChange: Dispatch<SetStateAction<string | null>>;
}

export const ReportDefinitionCol = ({ reportType, selectedReportDefinitions, onChange }: Props) => {
  const { indexPattern } = useIndexPatternContext();

  return (
    <div>
      {selectedReportDefinitions && (
        <EuiFlexGroup gutterSize="xs" wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge iconSide="right" iconType="cross">
              Web App: {selectedReportDefinitions}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiSpacer size="s" />
      {ReportDefinitionMap[reportType].map(({ field }) => (
        <FieldValueSelection
          key={field}
          sourceField={field}
          indexPattern={indexPattern}
          value={selectedReportDefinitions?.[field]}
          onChange={(val: string) => onChange(val)}
        />
      ))}
    </div>
  );
};
