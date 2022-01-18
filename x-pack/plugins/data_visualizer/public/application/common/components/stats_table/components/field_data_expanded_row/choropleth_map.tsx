/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { EuiSpacer, EuiText, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  COLOR_MAP_TYPE,
  VectorLayerDescriptor,
} from '../../../../../../../../maps/common';
import { EMSTermJoinConfig } from '../../../../../../../../maps/public';
import { EmbeddedMapComponent } from '../../../embedded_map';
import { FieldVisStats } from '../../../../../../../common/types';
import { ExpandedRowPanel } from './expanded_row_panel';

export const getChoroplethTopValuesLayer = (
  fieldName: string,
  topValues: Array<{ key: any; doc_count: number }>,
  { layerId, field }: EMSTermJoinConfig
): VectorLayerDescriptor => {
  return {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.dataVisualizer.choroplethMap.topValuesCount', {
      defaultMessage: 'Top values count for {fieldName}',
      values: { fieldName },
    }),
    joins: [
      {
        // Left join is the id from the type of field (e.g. world_countries)
        leftField: field,
        right: {
          id: 'anomaly_count',
          type: SOURCE_TYPES.TABLE_SOURCE,
          __rows: topValues,
          __columns: [
            {
              name: 'key',
              type: 'string',
            },
            {
              name: 'doc_count',
              type: 'number',
            },
          ],
          // Right join/term is the field in the doc you’re trying to join it to (foreign key - e.g. US)
          term: 'key',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: layerId,
    },
    style: {
      type: 'VECTOR',
      // @ts-ignore missing style properties. Remove once 'VectorLayerDescriptor' type is updated
      properties: {
        icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
        fillColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: COLOR_MAP_TYPE.ORDINAL,
            field: {
              name: 'doc_count',
              origin: FIELD_ORIGIN.JOIN,
            },
            useCustomColorRamp: false,
          },
        },
        lineColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: { fieldMetaOptions: { isEnabled: true } },
        },
        lineWidth: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
      },
      isTimeAware: true,
    },
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };
};

interface Props {
  stats: FieldVisStats | undefined;
  suggestion: EMSTermJoinConfig;
}

export const ChoroplethMap: FC<Props> = ({ stats, suggestion }) => {
  const { fieldName, isTopValuesSampled, topValues, topValuesSamplerShardSize } = stats!;

  const layerList: VectorLayerDescriptor[] = useMemo(
    () => [getChoroplethTopValuesLayer(fieldName || '', topValues || [], suggestion)],
    [suggestion, fieldName, topValues]
  );

  return (
    <ExpandedRowPanel
      dataTestSubj={'fileDataVisualizerChoroplethMapTopValues'}
      className={'dvPanel__wrapper'}
      grow={true}
    >
      <div className={'dvMap__wrapper'}>
        <EmbeddedMapComponent layerList={layerList} />
      </div>

      {isTopValuesSampled === true && (
        <div>
          <EuiSpacer size={'s'} />
          <EuiText size="xs" textAlign={'center'}>
            <FormattedMessage
              id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.choroplethMapTopValues.calculatedFromSampleDescription"
              defaultMessage="Calculated from sample of {topValuesSamplerShardSize} documents per shard"
              values={{
                topValuesSamplerShardSize,
              }}
            />
          </EuiText>
        </div>
      )}
    </ExpandedRowPanel>
  );
};
