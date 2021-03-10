/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FieldLabels } from '../../configurations/constants';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { SeriesUrl } from '../../types';

interface Props {
  seriesId: string;
  breakdowns: string[];
}

export const Breakdowns = ({ seriesId, breakdowns = [] }: Props) => {
  const options = breakdowns.map((breakdown) => ({ id: breakdown, label: FieldLabels[breakdown] }));

  const [selectedBreakdown, setSelectedBreakdown] = useState<string>();

  const onClick = (optionId: string) => {
    setSelectedBreakdown((prevState) => (prevState === optionId ? undefined : optionId));
  };

  const storage = useUrlStorage();
  const series = storage.get<SeriesUrl>(seriesId) ?? {};

  useEffect(() => {
    storage.set(seriesId, { ...series, breakdown: selectedBreakdown });
  }, [selectedBreakdown]);

  return (
    <div style={{ width: 200 }}>
      {options.map(({ id, label }) => (
        <div key={id}>
          <EuiButton
            fullWidth={true}
            iconType={id === selectedBreakdown ? 'check' : undefined}
            size="s"
            color={id === selectedBreakdown ? 'primary' : 'text'}
            fill={id === selectedBreakdown}
            onClick={() => onClick(id)}
          >
            {label}
          </EuiButton>
          <EuiSpacer size="xs" />
        </div>
      ))}
    </div>
  );
};
