/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ChangeEvent } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: string;
  series: SeriesUrl;
}

export function SeriesName({ series, seriesId }: Props) {
  const { setSeries } = useSeriesStorage();

  const [value, setValue] = useState(seriesId);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    e.stopPropagation();
  };

  const onSave = () => {
    if (value !== seriesId) {
      setSeries(series.name, { ...series, name: value });
    }
  };

  return <EuiFieldText value={value} onChange={onChange} fullWidth onBlur={onSave} />;
}
