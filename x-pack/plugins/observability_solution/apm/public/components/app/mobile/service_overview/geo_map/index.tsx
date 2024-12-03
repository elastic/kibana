/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { EuiSpacer } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { EmbeddedMap } from './embedded_map';
import { MapTypes } from '../../../../../../common/mobile/constants';
import { EmbeddedMapSelect } from './embedded_map_select';

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
        />
      </div>
    </>
  );
}
