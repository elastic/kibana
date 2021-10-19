/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiIcon, EuiPopover } from '@elastic/eui';
import { WaterfallMarkerTrend } from './waterfall_marker_trend';

export function WaterfallMarkerIcon({ field, label }: { field: string; label: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!field) {
    return <EuiIcon type="dot" size="l" />;
  }

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelStyle={{ paddingBottom: 0, paddingLeft: 4 }}
      zIndex={100}
      button={
        <EuiButtonIcon
          iconType="dot"
          iconSize="l"
          color="text"
          onClick={() => setIsOpen((prevState) => !prevState)}
        />
      }
    >
      <WaterfallMarkerTrend title={label} field={field} />
    </EuiPopover>
  );
}
