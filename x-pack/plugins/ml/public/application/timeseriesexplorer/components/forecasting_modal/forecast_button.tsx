/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  isDisabled: boolean;
  onClick: () => void;
  mode: 'full' | 'empty';
}

export const ForecastButton: FC<Props> = ({ isDisabled, onClick, mode = 'full' }) => {
  const Button = mode === 'full' ? EuiButton : EuiButtonEmpty;
  return (
    <Button
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlSingleMetricViewerButtonForecast"
    >
      <FormattedMessage
        id="xpack.ml.timeSeriesExplorer.forecastingModal.forecastButtonLabel"
        defaultMessage="Forecast"
      />
    </Button>
  );
};
