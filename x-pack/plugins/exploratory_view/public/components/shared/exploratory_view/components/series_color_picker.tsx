/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiColorPicker,
  EuiFormRow,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTheme } from '../../../../hooks/use_theme';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesUrl } from '../types';

export function SeriesColorPicker({ seriesId, series }: { seriesId: number; series: SeriesUrl }) {
  const theme = useTheme();

  const { setSeries } = useSeriesStorage();

  const [isOpen, setIsOpen] = useState(false);

  const onChange = (colorN: string) => {
    setSeries(seriesId, { ...series, color: colorN });
  };

  const color =
    series.color ?? (theme.eui as unknown as Record<string, string>)[`euiColorVis${seriesId}`];

  const button = (
    <EuiToolTip content={EDIT_SERIES_COLOR_LABEL}>
      <EuiButtonEmpty
        data-test-subj="o11ySeriesColorPickerButton"
        size="s"
        onClick={() => setIsOpen((prevState) => !prevState)}
        flush="both"
      >
        <EuiIcon type="stopFilled" size="l" color={color} />
      </EuiButtonEmpty>
    </EuiToolTip>
  );

  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={() => setIsOpen(false)}>
      <EuiFormRow label={PICK_A_COLOR_LABEL}>
        <EuiColorPicker onChange={onChange} color={color} />
      </EuiFormRow>
    </EuiPopover>
  );
}

const PICK_A_COLOR_LABEL = i18n.translate('xpack.exploratoryView.pickColor', {
  defaultMessage: 'Pick a color',
});

const EDIT_SERIES_COLOR_LABEL = i18n.translate('xpack.exploratoryView.editSeriesColor', {
  defaultMessage: 'Edit color for series',
});
