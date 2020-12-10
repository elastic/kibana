/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiLoadingSpinner, EuiBasicTableColumn } from '@elastic/eui';
import { euiStyled } from '../../../../../../../../../observability/public';
import { ProcessListAPIResponse } from '../../../../../../../../common/http_api';
import { STATE_NAMES } from './states';

interface Props {
  processSummary: ProcessListAPIResponse['summary'];
  isLoading: boolean;
}

type SummaryColumn = {
  total: number;
} & Record<keyof typeof STATE_NAMES, number>;

export const SummaryTable = ({ processSummary, isLoading }: Props) => {
  const processCount = useMemo(
    () =>
      [
        {
          total: isLoading ? -1 : processSummary.total,
          ...mapValues(STATE_NAMES, () => (isLoading ? -1 : 0)),
          ...(isLoading ? {} : processSummary),
        },
      ] as SummaryColumn[],
    [processSummary, isLoading]
  );
  return (
    <StyleWrapper>
      <EuiBasicTable items={processCount} columns={columns} />
    </StyleWrapper>
  );
};

const loadingRenderer = (value: number) => (value === -1 ? <LoadingSpinner /> : value);

const columns = [
  {
    field: 'total',
    name: i18n.translate('xpack.infra.metrics.nodeDetails.processes.headingTotalProcesses', {
      defaultMessage: 'Total processes',
    }),
    width: 125,
    render: loadingRenderer,
  },
  ...Object.entries(STATE_NAMES).map(([field, name]) => ({ field, name, render: loadingRenderer })),
] as Array<EuiBasicTableColumn<SummaryColumn>>;

const LoadingSpinner = euiStyled(EuiLoadingSpinner).attrs({ size: 'm' })`
  margin-top: 2px;
  margin-bottom: 3px;
`;

const StyleWrapper = euiStyled.div`
  & .euiTableHeaderCell {
    border-bottom: none;
    & .euiTableCellContent {
      padding-bottom: 0;
    }
    & .euiTableCellContent__text {
      font-size: ${(props) => props.theme.eui.euiFontSizeS};
    }
  }

  & .euiTableRowCell {
    border-top: none;
    & .euiTableCellContent {
      padding-top: 0;
    }
  }
`;
