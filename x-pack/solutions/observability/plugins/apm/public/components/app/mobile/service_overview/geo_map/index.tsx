/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EuiSpacer } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { useEuiTheme } from '@elastic/eui';
import { EmbeddedMap } from './embedded_map';
import { MapTypes } from '../../../../../../common/mobile/constants';
import { EmbeddedMapSelect } from './embedded_map_select';
import type { StyleColorParams } from './map_layers/style_color_params';

export function GeoMap({
  start,
  end,
  kuery,
  filters,
  dataView,
}: {
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
  dataView?: DataView;
}) {
  const [selectedMap, selectMap] = useState(MapTypes.Http);
  const { euiTheme } = useEuiTheme();

  const styleColors = {
    lineColor: euiTheme.colors.textParagraph,
    labelColor: euiTheme.colors.textParagraph,
    labelOutlineColor: euiTheme.colors.backgroundBasePlain,
  } as StyleColorParams;
  return (
    <>
      <EmbeddedMapSelect selectedMap={selectedMap} onChange={selectMap} />
      <EuiSpacer size="s" />
      <div
        style={{
          height: 500,
        }}
      >
        <EmbeddedMap
          selectedMap={selectedMap}
          start={start}
          end={end}
          kuery={kuery}
          filters={filters}
          dataView={dataView}
          styleColors={styleColors}
        />
      </div>
    </>
  );
}
