/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import React from 'react';
import { keyBy } from 'lodash';
import { IUrlParams } from '../../../../../context/url_params_context/types';
import {
  IWaterfall,
  WaterfallLegendType,
} from './Waterfall/waterfall_helpers/waterfall_helpers';
import { Waterfall } from './Waterfall';
import { WaterfallLegends } from './WaterfallLegends';

interface Props {
  urlParams: IUrlParams;
  location: Location;
  waterfall: IWaterfall;
  exceedsMax: boolean;
}

export function WaterfallContainer({
  location,
  urlParams,
  waterfall,
  exceedsMax,
}: Props) {
  if (!waterfall) {
    return null;
  }

  const { legends, items } = waterfall;

  const serviceLegends = legends.filter(
    ({ type }) => type === WaterfallLegendType.ServiceName
  );

  const serviceColors = serviceLegends.reduce((colorMap, legend) => {
    return {
      ...colorMap,
      [legend.value!]: legend.color,
    };
  }, {} as Record<string, string>);

  const colorBy =
    serviceLegends.length > 1
      ? WaterfallLegendType.ServiceName
      : WaterfallLegendType.SpanType;

  const displayedLegends = legends.filter((legend) => legend.type === colorBy);

  const legendsByValue = keyBy(displayedLegends, 'value');

  items.forEach((item) => {
    let color = '';
    if ('legendValues' in item) {
      color = legendsByValue[item.legendValues[colorBy]].color;
    }

    if (!color) {
      color = serviceColors[item.doc.service.name];
    }

    item.color = color;
  });

  return (
    <div>
      <WaterfallLegends legends={displayedLegends} type={colorBy} />
      <Waterfall
        location={location}
        waterfallItemId={urlParams.waterfallItemId}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
      />
    </div>
  );
}
