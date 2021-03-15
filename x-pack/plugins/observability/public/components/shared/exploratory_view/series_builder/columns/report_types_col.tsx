/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ReportViewTypeId } from '../../types';

interface Props {
  selectedReportType: ReportViewTypeId | null;
  reportTypes: { id: ReportViewTypeId; label: string }[];
  onChange: Dispatch<SetStateAction<ReportViewTypeId | null>>;
}

export const ReportTypesCol = ({ selectedReportType, reportTypes, onChange }: Props) => {
  return reportTypes?.length > 0 ? (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {reportTypes.map(({ id: reportType, label }) => (
        <EuiFlexItem key={reportType}>
          <EuiButton
            size="s"
            iconSide="right"
            iconType="arrowRight"
            color={selectedReportType === reportType ? 'primary' : 'text'}
            fill={selectedReportType === reportType}
            onClick={() => onChange(reportType === selectedReportType ? null : reportType)}
          >
            {label}
          </EuiButton>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  ) : (
    <EuiText color="subdued"> Select a data type to start building a series. </EuiText>
  );
};
