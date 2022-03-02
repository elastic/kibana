/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AreaSeries,
  BarSeries,
  ScaleType,
  RecursivePartial,
  BarSeriesStyle,
  AreaSeriesStyle,
} from '@elastic/charts';
import { NodeDetailsDataSeries } from '../../../../../common/http_api/node_details_api';
import { InventoryVisType } from '../../../../../common/inventory_models/types';
import { useKibanaTimeZoneSetting } from '../../../../hooks/use_kibana_time_zone_setting';

interface Props {
  id: string;
  name: string;
  color: string | null;
  series: NodeDetailsDataSeries;
  type: InventoryVisType;
  stack: boolean | undefined;
}

export const SeriesChart = (props: Props) => {
  if (props.type === 'bar') {
    return <BarChart {...props} />;
  }
  return <AreaChart {...props} />;
};

export const AreaChart = ({ id, color, series, name, type, stack }: Props) => {
  const timezone = useKibanaTimeZoneSetting();
  const style: RecursivePartial<AreaSeriesStyle> = {
    area: {
      opacity: 1,
      visible: 'area' === type,
    },
    line: {
      strokeWidth: 'area' === type ? 1 : 2,
      visible: true,
    },
  };
  return (
    <AreaSeries
      id={id}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      areaSeriesStyle={style}
      color={color ? color : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
      timeZone={timezone}
    />
  );
};

export const BarChart = ({ id, color, series, name, stack }: Props) => {
  const timezone = useKibanaTimeZoneSetting();
  const style: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: color || void 0,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 1,
    },
  };
  return (
    <BarSeries
      id={id}
      name={name}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={['value']}
      data={series.data}
      barSeriesStyle={style}
      color={color ? color : void 0}
      stackAccessors={stack ? ['timestamp'] : void 0}
      timeZone={timezone}
    />
  );
};
