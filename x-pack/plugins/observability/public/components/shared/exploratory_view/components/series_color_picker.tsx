/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiColorPicker, EuiFormRow, EuiIcon, EuiPopover, EuiToolTip } from '@elastic/eui';
import { useTheme } from '../../../../hooks/use_theme';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { ToolbarButton } from '../../../../../../../../src/plugins/kibana_react/public';
import { SeriesUrl } from '../types';

export function SeriesColorPicker({ seriesId, series }: { seriesId: string; series: SeriesUrl }) {
  const theme = useTheme();

  const { setSeries } = useSeriesStorage();

  const [isOpen, setIsOpen] = useState(false);

  const onChane = (colorN: string) => {
    setSeries(seriesId, { ...series, color: colorN });
  };

  const color =
    series.color ??
    ((theme.eui as unknown) as Record<string, string>)[`euiColorVis${series.order}`];

  const button = (
    <EuiToolTip content={'Edit color for series'}>
      <ToolbarButton size="s" onClick={() => setIsOpen((prevState) => !prevState)} hasArrow={false}>
        <EuiIcon type="dot" size="l" color={color} />
      </ToolbarButton>
    </EuiToolTip>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={() => setIsOpen(false)}>
      <EuiFormRow label="Pick a color">
        <EuiColorPicker onChange={onChane} color={color} />
      </EuiFormRow>
    </EuiPopover>
  );
}
