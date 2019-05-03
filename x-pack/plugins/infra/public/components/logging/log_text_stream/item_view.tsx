/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { TextScale } from '../../../../common/log_text_scale';
import { StreamItem } from './item';
import { LogTextStreamLogEntryItemView } from './log_entry_item_view';

interface StreamItemProps {
  item: StreamItem;
  scale: TextScale;
  wrap: boolean;
  openFlyoutWithItem: (id: string) => void;
  isHighlighted: boolean;
}

export const LogTextStreamItemView = React.forwardRef<Element, StreamItemProps>(
  ({ item, scale, wrap, openFlyoutWithItem, isHighlighted }, ref) => {
    switch (item.kind) {
      case 'logEntry':
        return (
          <LogTextStreamLogEntryItemView
            boundingBoxRef={ref}
            logEntry={item.logEntry}
            scale={scale}
            wrap={wrap}
            openFlyoutWithItem={openFlyoutWithItem}
            isHighlighted={isHighlighted}
          />
        );
    }
  }
);
