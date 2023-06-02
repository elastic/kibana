/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ProcessListAPIResponse } from '../../../../../../../../common/http_api';
import { STATE_NAMES } from './states';

interface Props {
  processSummary: ProcessListAPIResponse['summary'];
  isLoading: boolean;
}

type SummaryRecord = {
  total: number;
} & Record<keyof typeof STATE_NAMES, number>;

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.infra.notAvailableLabel', {
  defaultMessage: 'N/A',
});

const processSummaryNotAvailable = {
  total: NOT_AVAILABLE_LABEL,
  running: NOT_AVAILABLE_LABEL,
  sleeping: NOT_AVAILABLE_LABEL,
  dead: NOT_AVAILABLE_LABEL,
  stopped: NOT_AVAILABLE_LABEL,
  idle: NOT_AVAILABLE_LABEL,
  zombie: NOT_AVAILABLE_LABEL,
  unknown: NOT_AVAILABLE_LABEL,
};

export const SummaryTable = ({ processSummary, isLoading }: Props) => {
  const summary = !processSummary?.total ? processSummaryNotAvailable : processSummary;

  const processCount = useMemo(
    () =>
      ({
        total: isLoading ? -1 : summary.total,
        ...mapValues(STATE_NAMES, () => (isLoading ? -1 : 0)),
        ...(isLoading ? {} : summary),
      } as SummaryRecord),
    [summary, isLoading]
  );
  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap={true}>
        {Object.entries(processCount).map(([field, value]) => (
          <EuiFlexItem key={field}>
            <EuiDescriptionList data-test-subj="infraProcessesSummaryTableItem" compressed>
              <ColumnTitle>{columnTitles[field as keyof SummaryRecord]}</ColumnTitle>
              <EuiDescriptionListDescription>
                {value === -1 ? <LoadingSpinner /> : value}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
};

const columnTitles = {
  total: i18n.translate('xpack.infra.metrics.nodeDetails.processes.headingTotalProcesses', {
    defaultMessage: 'Total processes',
  }),
  ...STATE_NAMES,
};

const LoadingSpinner = euiStyled(EuiLoadingSpinner).attrs({ size: 'm' })`
  margin-top: 2px;
  margin-bottom: 3px;
`;

const ColumnTitle = euiStyled(EuiDescriptionListTitle)`
  white-space: nowrap;
`;
