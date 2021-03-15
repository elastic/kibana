/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { METRIC_TYPE } from '../configurations/constants';

export const MetricSelection = ({ seriesId }: { seriesId: string }) => {
  const toggleButtons = [
    {
      id: `avg`,
      label: 'Avg',
    },
    {
      id: `median`,
      label: 'Median',
    },
    {
      id: `95th`,
      label: '95th',
    },
    {
      id: `99th`,
      label: '99th',
    },
  ];

  const { series, setSeries, allSeries } = useUrlStorage(seriesId);

  const [toggleIdSelected, setToggleIdSelected] = useState(series?.[METRIC_TYPE] ?? 'avg');

  const onChange = (optionId: string) => {
    setToggleIdSelected(optionId);

    Object.keys(allSeries).forEach((seriesKey) => {
      const seriesN = allSeries[seriesKey];

      setSeries(seriesKey, { ...seriesN, [METRIC_TYPE]: optionId });
    });
  };

  return (
    <EuiButtonGroup
      color="primary"
      legend="This is a basic group"
      options={toggleButtons}
      idSelected={toggleIdSelected}
      onChange={(id) => onChange(id)}
    />
  );
};
