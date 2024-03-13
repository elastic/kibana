/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import { css } from '@emotion/react';
import type { ProcessListAPIResponse } from '../../../../../common/http_api';
import { STATE_NAMES } from './states';
import { NOT_AVAILABLE_LABEL } from '../../translations';

interface Props {
  processSummary: ProcessListAPIResponse['summary'];
  isLoading: boolean;
}

type SummaryRecord = {
  total: number | string;
} & Record<keyof typeof STATE_NAMES, number | string>;

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
  const mergedSummary: SummaryRecord = useMemo(
    () => ({
      ...processSummaryNotAvailable,
      ...Object.fromEntries(Object.entries(processSummary).filter(([_, v]) => !!v)),
    }),
    [processSummary]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        {Object.entries(mergedSummary).map(([field, value]) => (
          <EuiFlexItem key={field}>
            <EuiDescriptionList
              data-test-subj="infraAssetDetailsProcessesSummaryTableItem"
              compressed
            >
              <EuiDescriptionListTitle
                css={css`
                  white-space: nowrap;
                `}
              >
                {columnTitles[field as keyof SummaryRecord]}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {isLoading ? <EuiLoadingSpinner size="m" /> : value}
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
