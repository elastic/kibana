/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { BREAK_DOWN, FieldLabels } from '../../configurations/constants';
import { useUrlStorage } from '../../hooks/use_url_strorage';
import { i18n } from '@kbn/i18n';

interface Props {
  seriesId: string;
  breakdowns: string[];
}

export function Breakdowns({ seriesId, breakdowns = [] }: Props) {
  const items = breakdowns.map((breakdown) => ({ id: breakdown, label: FieldLabels[breakdown] }));

  const [selectedBreakdown, setSelectedBreakdown] = useState<string>();

  const onOptionChange = (optionId: string) => {
    setSelectedBreakdown((prevState) => (prevState === optionId ? undefined : optionId));
  };

  const { setSeries, series } = useUrlStorage(seriesId);

  useEffect(() => {
    setSeries(seriesId, { ...series, [BREAK_DOWN]: selectedBreakdown });
  }, [selectedBreakdown]);

  const NO_BREAKDOWN = 'no_breakdown';

  items.push({
    id: NO_BREAKDOWN,
    label: i18n.translate('xpack.observability.exp.breakDownFilter.noBreakdown', {
      defaultMessage: 'No breakdown',
    }),
  });

  const options = items.map(({ id, label }) => ({
    inputDisplay: id === NO_BREAKDOWN ? label : <strong>{label}</strong>,
    value: id,
    dropdownDisplay: label,
  }));

  return (
    <div style={{ width: 200 }}>
      <EuiSuperSelect
        fullWidth
        compressed
        options={options}
        valueOfSelected={selectedBreakdown ?? NO_BREAKDOWN}
        onChange={(value) => onOptionChange(value)}
        data-test-subj={'seriesBreakdown'}
      />
    </div>
  );
}
