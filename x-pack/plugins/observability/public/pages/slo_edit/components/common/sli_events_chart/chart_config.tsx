/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButtonIcon, EuiRange } from '@elastic/eui';
export function ChartConfig({
  groupSampleSize,
  setGroupSampleSize,
}: {
  setGroupSampleSize: (value: number) => void;
  groupSampleSize: number;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj="o11yChartConfigButton"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          iconType="controlsHorizontal"
          color="text"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiText style={{ width: 400 }}>
        <p>
          <EuiRange
            id={'noOfItems'}
            min={5}
            max={50}
            step={5}
            showTicks={true}
            value={groupSampleSize}
            onChange={(e) => {
              setGroupSampleSize(Number(e.currentTarget.value));
            }}
            showLabels
            aria-label={i18n.translate(
              'xpack.observability.chartConfig.euiRange.numberOfItemsLabel',
              { defaultMessage: 'Number of items' }
            )}
          />
        </p>
      </EuiText>
    </EuiPopover>
  );
}
