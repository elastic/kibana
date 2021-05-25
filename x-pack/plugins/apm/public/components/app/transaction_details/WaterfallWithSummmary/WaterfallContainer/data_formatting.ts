/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SidebarItems,
  WaterfallData,
} from '../../../../../../../observability/public';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';
import { LegendItems } from '../../../../../../../uptime/public/components/monitor/synthetics/step_detail/waterfall/types';
import { getAgentMarks } from './Marks/get_agent_marks';

export const getSeriesAndDomain = (
  data: IWaterfall,
  query: string,
  onlyHighlighted: boolean,
  activeFilters: string[]
) => {
  const { items, legends } = data;

  const series: WaterfallData = [];

  items.forEach((item, index) => {
    if (item.docType === 'span') {
      const valueLabel = item.doc.span.name;

      const colour =
        legends.find(
          (lg) =>
            lg.value === item.doc.span.type ||
            lg.value === item.doc.span.subtype
        )?.color ?? 'red';

      series.push({
        x: index,
        offset: (item.offset + item.skew) / 1000,
        duration: (item.duration + item.offset) / 1000,
        valueLabel,
        config: {
          colour,
          isHighlighted: !query || valueLabel.includes(query),
          showTooltip: true,
          tooltipProps: {
            colour,
            valueLabel,
          },
        },
      });
    } else {
      const valueLabel = item.doc?.transaction?.name;
      series.push({
        x: index,
        offset: item.offset / 1000,
        duration: item.duration / 1000,
        valueLabel,
        config: {
          isHighlighted: !query || valueLabel.includes(query),
          showTooltip: true,
          tooltipProps: {
            colour: 'green',
            valueLabel,
          },
        },
      });
    }
  });

  if (onlyHighlighted) {
    return { series: series.filter(({ config }) => config.isHighlighted) };
  }

  return { series };
};

export const getSidebarItems = (
  data: IWaterfall,
  query: string,
  onlyHighlighted: boolean,
  activeFilters: string[]
): SidebarItems => {
  const { items } = data;

  const sideBarItems = items.map((item, index) => {
    let httpStatusCode: number | undefined;
    if (item.docType === 'span') {
      const span = item.doc;
      const httpContext = span.span.http;
      httpStatusCode = httpContext?.response?.status_code;
    }
    if (item.docType === 'transaction') {
      const transaction = item.doc;
      httpStatusCode = transaction?.http?.response?.status_code;
    }

    const offsetIndex = index + 1;
    const url = item.doc?.transaction?.name || item.doc?.span?.name;
    return {
      url,
      status: httpStatusCode,
      isHighlighted: !query || url.includes(query),
      offsetIndex,
      index,
    };
  });

  if (onlyHighlighted) {
    return sideBarItems.filter(({ isHighlighted }) => isHighlighted);
  }

  return sideBarItems;
};

export const getLegendItems = (data: IWaterfall): LegendItems => {
  const { legends } = data;

  const legendsItems: LegendItems = [];
  legends.forEach((legend) => {
    legendsItems.push({ colour: legend.color, name: legend.value });
  });

  return legendsItems;
};

export const getMarkers = (data: IWaterfall) => {
  const transaction = data.items[0].doc;
  return getAgentMarks(transaction);
};
