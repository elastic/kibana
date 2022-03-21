/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { FileLayer } from '@elastic/ems-client';
import { IUiSettingsClient } from 'kibana/public';
import type { EmbeddableFactory } from 'src/plugins/embeddable/public';
import type { Datatable } from 'src/plugins/expressions/public';
import type { FormatFactory } from 'src/plugins/field_formats/common';
import {
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  COLOR_MAP_TYPE,
  VECTOR_STYLES,
} from '../../../common';
import { emsWorldLayerId } from '../../../common/constants';
import { ChoroplethChartProps } from './types';
import { getEmsSuggestion } from './get_ems_suggestion';
import { PassiveMap } from '../passive_map';
import type { MapEmbeddableInput, MapEmbeddableOutput } from '../../embeddable';

interface Props extends ChoroplethChartProps {
  formatFactory: FormatFactory;
  uiSettings: IUiSettingsClient;
  emsFileLayers: FileLayer[];
  mapEmbeddableFactory: EmbeddableFactory<MapEmbeddableInput, MapEmbeddableOutput>;
}

export function ChoroplethChart({
  data,
  args,
  formatFactory,
  uiSettings,
  emsFileLayers,
  mapEmbeddableFactory,
}: Props) {
  if (!args.regionAccessor || !args.valueAccessor) {
    return null;
  }

  const table = data.tables[args.layerId];

  let emsLayerId = args.emsLayerId ? args.emsLayerId : emsWorldLayerId;
  let emsField = args.emsField ? args.emsField : 'iso2';
  if (!args.emsLayerId || !args.emsField) {
    const emsSuggestion = getEmsSuggestion(emsFileLayers, table, args.regionAccessor);
    if (emsSuggestion) {
      emsLayerId = emsSuggestion.layerId;
      emsField = emsSuggestion.field;
    }
  }

  const emsLayerLabel = getEmsLayerLabel(emsLayerId, emsFileLayers);

  const choroplethLayer = {
    id: args.layerId,
    label: emsLayerLabel
      ? i18n.translate('xpack.maps.lens.choroplethChart.choroplethLayerLabel', {
          defaultMessage: '{emsLayerLabel} by {accessorLabel}',
          values: {
            emsLayerLabel,
            accessorLabel: getAccessorLabel(table, args.valueAccessor),
          },
        })
      : '',
    joins: [
      {
        leftField: emsField,
        right: {
          id: args.valueAccessor,
          type: SOURCE_TYPES.TABLE_SOURCE,
          __rows: table.rows,
          __columns: [
            {
              name: args.regionAccessor,
              label: getAccessorLabel(table, args.regionAccessor),
              type: 'string',
            },
            {
              name: args.valueAccessor,
              label: getAccessorLabel(table, args.valueAccessor),
              type: 'number',
            },
          ],
          // Right join/term is the field in the doc you’re trying to join it to (foreign key - e.g. US)
          term: args.regionAccessor,
        },
      },
    ],
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: emsLayerId,
      tooltipProperties: [emsField],
    },
    style: {
      type: 'VECTOR',
      // @ts-ignore missing style properties. Remove once 'VectorLayerDescriptor' type is updated
      properties: {
        [VECTOR_STYLES.FILL_COLOR]: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: COLOR_MAP_TYPE.ORDINAL,
            field: {
              name: args.valueAccessor,
              origin: FIELD_ORIGIN.JOIN,
            },
            useCustomColorRamp: false,
          },
        },
        [VECTOR_STYLES.LINE_COLOR]: {
          type: STYLE_TYPE.STATIC,
          options: {
            color: '#3d3d3d',
          },
        },
        [VECTOR_STYLES.LINE_WIDTH]: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
      },
      isTimeAware: false,
    },
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  return <PassiveMap passiveLayer={choroplethLayer} factory={mapEmbeddableFactory} />;
}

function getAccessorLabel(table: Datatable, accessor: string) {
  const column = table.columns.find((col) => {
    return col.id === accessor;
  });
  return column ? column.name : accessor;
}

function getEmsLayerLabel(emsLayerId: string, emsFileLayers: FileLayer[]): string | null {
  const fileLayer = emsFileLayers.find((file) => {
    return file.getId() === emsLayerId;
  });
  return fileLayer ? fileLayer.getDisplayName() : null;
}
