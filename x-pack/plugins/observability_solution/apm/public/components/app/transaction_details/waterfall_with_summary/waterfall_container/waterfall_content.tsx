/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { keyBy } from 'lodash';
import { Waterfall } from './waterfall';
import {
  IWaterfall,
  WaterfallLegendType,
  IWaterfallItem,
} from './waterfall/waterfall_helpers/waterfall_helpers';
import { WaterfallLegends } from './waterfall_legends';
import { OrphanTraceItemsWarning } from './waterfall/orphan_trace_items_warning';

interface Props {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  // when rendering in a container, this should be the element that should be scrolled
  scrollElement?: React.RefObject<HTMLDivElement>;
  showRelatedErrors?: boolean;
  stickyHeader?: boolean;
  onClickWaterfallItem?: (item: IWaterfallItem, flyoutDetailTab: string) => void;
}

export function WaterfallContent({
  serviceName,
  waterfallItemId,
  waterfall,
  showCriticalPath,
  scrollElement,
  showRelatedErrors = true,
  stickyHeader = true,
  onClickWaterfallItem,
}: Props) {
  if (!waterfall) {
    return null;
  }
  const { legends, items, orphanTraceItemsCount } = waterfall;

  // Service colors are needed to color the dot in the error popover
  const serviceLegends = legends.filter(({ type }) => type === WaterfallLegendType.ServiceName);
  const serviceColors = serviceLegends.reduce((colorMap, legend) => {
    return {
      ...colorMap,
      [legend.value!]: legend.color,
    };
  }, {} as Record<string, string>);

  // only color by span type if there are only events for one service
  const colorBy =
    serviceLegends.length > 1 ? WaterfallLegendType.ServiceName : WaterfallLegendType.SpanType;

  const displayedLegends = legends.filter((legend) => legend.type === colorBy);

  const legendsByValue = keyBy(displayedLegends, 'value');

  // mutate items rather than rebuilding both items and childrenByParentId
  items.forEach((item) => {
    let color = '';
    if ('legendValues' in item) {
      color = legendsByValue[item.legendValues[colorBy]].color;
    }

    if (!color) {
      // fall back to service color if there's no span.type, e.g. for transactions
      color = serviceColors[item.doc.service.name];
    }

    item.color = color;
  });

  // default to serviceName if value is empty, e.g. for transactions (which don't
  // have span.type or span.subtype)
  const legendsWithFallbackLabel = displayedLegends.map((legend) => {
    return { ...legend, value: !legend.value ? serviceName : legend.value };
  });

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <WaterfallLegends legends={legendsWithFallbackLabel} type={colorBy} />
          </EuiFlexItem>
          {orphanTraceItemsCount > 0 ? (
            <EuiFlexItem grow={false}>
              <OrphanTraceItemsWarning orphanTraceItemsCount={orphanTraceItemsCount} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <Waterfall
          showCriticalPath={showCriticalPath}
          waterfallItemId={waterfallItemId}
          waterfall={waterfall}
          scrollElement={scrollElement}
          onClickWaterfallItem={onClickWaterfallItem}
          showRelatedErrors={showRelatedErrors}
          stickyHeader={stickyHeader}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
