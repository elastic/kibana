/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonGroup, EuiPopover } from '@elastic/eui';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { OperationType } from '../../../../../../../lens/public';

const toggleButtons = [
  {
    id: `avg`,
    label: i18n.translate('xpack.observability.expView.metricsSelect.average', {
      defaultMessage: 'Average',
    }),
  },
  {
    id: `median`,
    label: i18n.translate('xpack.observability.expView.metricsSelect.median', {
      defaultMessage: 'Median',
    }),
  },
  {
    id: `95th`,
    label: i18n.translate('xpack.observability.expView.metricsSelect.9thPercentile', {
      defaultMessage: '95th Percentile',
    }),
  },
  {
    id: `99th`,
    label: i18n.translate('xpack.observability.expView.metricsSelect.99thPercentile', {
      defaultMessage: '99th Percentile',
    }),
  },
];

export function MetricSelection({
  seriesId,
  isDisabled,
}: {
  seriesId: string;
  isDisabled: boolean;
}) {
  const { series, setSeries, allSeries } = useUrlStorage(seriesId);

  const [isOpen, setIsOpen] = useState(false);

  const [toggleIdSelected, setToggleIdSelected] = useState(series?.metric ?? 'avg');

  const onChange = (optionId: OperationType) => {
    setToggleIdSelected(optionId);

    Object.keys(allSeries).forEach((seriesKey) => {
      const seriesN = allSeries[seriesKey];

      setSeries(seriesKey, { ...seriesN, metric: optionId });
    });
  };
  const button = (
    <EuiButton
      onClick={() => setIsOpen((prevState) => !prevState)}
      size="s"
      color="text"
      isDisabled={isDisabled}
    >
      {toggleButtons.find(({ id }) => id === toggleIdSelected)!.label}
    </EuiButton>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={() => setIsOpen(false)}>
      <EuiButtonGroup
        buttonSize="m"
        color="primary"
        legend="Chart metric group"
        options={toggleButtons}
        idSelected={toggleIdSelected}
        onChange={(id) => onChange(id as OperationType)}
      />
    </EuiPopover>
  );
}
