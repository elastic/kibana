/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { Vis } from '../../../../../../src/plugins/visualizations/public';
import { getData, getShareService } from '../../kibana_services';
import { ViewInMaps } from '../view_in_maps';
import { extractLayerDescriptorParams } from './utils';
import { RegionMapVisParams } from './types';
import { title } from './region_map_vis_type';

export function RegionMapEditor(props: VisEditorOptionsProps) {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const locator = getShareService().url.locators.get('MAPS_APP_REGION_MAP_LOCATOR');
    if (!locator) return;

    const query = getData().query;
    locator.navigate({
      ...extractLayerDescriptorParams(props.vis as unknown as Vis<RegionMapVisParams>),
      filters: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      timeRange: query.timefilter.timefilter.getTime(),
    });
  };

  return <ViewInMaps onClick={onClick} visualizationLabel={title} />;
}
