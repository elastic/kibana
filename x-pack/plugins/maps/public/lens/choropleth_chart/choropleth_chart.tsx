/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid/v4';
import React from 'react';
import { IUiSettingsClient } from 'kibana/public';
import type { FormatFactory } from 'src/plugins/field_formats/common';
import { MapComponent } from '../../embeddable';
import {
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  COLOR_MAP_TYPE,
} from '../../../common';
import { ChoroplethChartProps } from './types';
import { Icon } from './icon';

export function ChoroplethChart({
  data,
  args,
  formatFactory,
  uiSettings,
}: ChoroplethChartProps & {
  formatFactory: FormatFactory;
  uiSettings: IUiSettingsClient;
}) {
  if (args.isPreview) {
    return <Icon />;
  }

  const layerList = args.layerId
    ? [
        {
          id: uuid(),
          label: args.title,
          joins: [
            {
              leftField: args.emsField,
              right: {
                id: args.metricColumnId,
                type: SOURCE_TYPES.TABLE_SOURCE,
                __rows: data.tables[args.layerId].rows,
                __columns: [
                  {
                    name: args.bucketColumnId,
                    type: 'string',
                  },
                  {
                    name: args.metricColumnId,
                    type: 'number',
                  },
                ],
                // Right join/term is the field in the doc you’re trying to join it to (foreign key - e.g. US)
                term: args.bucketColumnId,
              },
            },
          ],
          sourceDescriptor: {
            type: SOURCE_TYPES.EMS_FILE,
            id: args.emsLayerId,
          },
          style: {
            type: 'VECTOR',
            // @ts-ignore missing style properties. Remove once 'VectorLayerDescriptor' type is updated
            properties: {
              fillColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  color: 'Blue to Red',
                  colorCategory: 'palette_0',
                  fieldMetaOptions: { isEnabled: true, sigma: 3 },
                  type: COLOR_MAP_TYPE.ORDINAL,
                  field: {
                    name: args.metricColumnId,
                    origin: FIELD_ORIGIN.JOIN,
                  },
                  useCustomColorRamp: false,
                },
              },
              lineWidth: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
            },
            isTimeAware: false,
          },
          type: LAYER_TYPE.GEOJSON_VECTOR,
        },
      ]
    : [];

  return (
    <MapComponent
      getLayerDescriptors={() => {
        return layerList;
      }}
    />
  );
}
