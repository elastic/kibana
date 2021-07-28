/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ChangeEvent, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: number;
  series: SeriesUrl;
}

export function SeriesName({ series, seriesId }: Props) {
  const { setSeries } = useSeriesStorage();

  const [value, setValue] = useState(series.name);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const onSave = () => {
    if (value !== series.name) {
      setSeries(seriesId, { ...series, name: value });
    }
  };

  useEffect(() => {
    setValue(series.name);
  }, [series.name]);

  return <EuiFieldText value={value} onChange={onChange} fullWidth onBlur={onSave} />;
}
