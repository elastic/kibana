/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { ExplorerChartSeriesErrorMessages } from './explorer_charts_container_service';

interface ExplorerChartsErrorCalloutsProps {
  errorMessagesByType: ExplorerChartSeriesErrorMessages;
}

export const ExplorerChartsErrorCallOuts: FC<ExplorerChartsErrorCalloutsProps> = ({
  errorMessagesByType,
}) => {
  if (!errorMessagesByType || Object.keys(errorMessagesByType).length === 0) return null;
  const content = Object.keys(errorMessagesByType).map((errorType) => (
    <EuiCallOut color={'warning'} size="s" key={errorType}>
      <FormattedMessage
        id="xpack.ml.explorerCharts.errorCallOutMessage"
        defaultMessage="You can't view anomaly charts for {jobs} because {reason}."
        values={{ jobs: [...errorMessagesByType[errorType]].join(', '), reason: errorType }}
      />
    </EuiCallOut>
  ));
  return (
    <>
      {content}
      <EuiSpacer size={'m'} />
    </>
  );
};
