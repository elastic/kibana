/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiRange, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  QueryQualityLevel,
  useQueryQuality,
} from '../../../context/query_quality/query_quality_context';

const TICKS = [
  {
    value: QueryQualityLevel.fastest,
    label: i18n.translate('xpack.apm.queryQualitySlider.fastest', { defaultMessage: 'Fastest' }),
  },
  {
    value: QueryQualityLevel.fast,
    label: '',
  },
  {
    value: QueryQualityLevel.default,
    label: i18n.translate('xpack.apm.queryQualitySlider.default', { defaultMessage: 'Default' }),
  },
  {
    value: QueryQualityLevel.accurate,
    label: '',
  },
  {
    value: QueryQualityLevel.mostAccurate,
    label: i18n.translate('xpack.apm.queryQualitySlider.mostAccurate', {
      defaultMessage: 'Accurate',
    }),
  },
];

const sliderStyles = css`
  width: 160px;
`;

export function QueryQualitySlider() {
  const { qualityLevel, setQualityLevel } = useQueryQuality();

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
      setQualityLevel(Number((e.target as HTMLInputElement).value) as QueryQualityLevel);
    },
    [setQualityLevel]
  );

  return (
    <EuiToolTip
      delay="regular"
      content={i18n.translate('xpack.apm.queryQualitySlider.tooltip', {
        defaultMessage:
          'Adjust query granularity. Lower values produce faster but less detailed results.',
      })}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bolt" size="s" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={sliderStyles}>
          <EuiRange
            min={QueryQualityLevel.fastest}
            max={QueryQualityLevel.mostAccurate}
            step={1}
            value={qualityLevel}
            onChange={(event) => onChange(event as React.ChangeEvent<HTMLInputElement>)}
            showTicks
            ticks={TICKS}
            compressed
            aria-label={i18n.translate('xpack.apm.queryQualitySlider.ariaLabel', {
              defaultMessage: 'Query accuracy vs speed',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="visGauge" size="s" aria-hidden={true} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
}
