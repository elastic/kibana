/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiText, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { VectorLayerDescriptor } from '@kbn/maps-plugin/common';
import {
  FIELD_ORIGIN,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  COLOR_MAP_TYPE,
} from '@kbn/maps-plugin/common';
import type { EMSTermJoinConfig } from '@kbn/maps-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { useDataVisualizerKibana } from '../../../../../kibana_context';
import { EmbeddedMapComponent } from '../../../embedded_map';
import type { FieldVisStats } from '../../../../../../../common/types';
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
  const {
    services: {
      data: { fieldFormats },
    },
  } = useDataVisualizerKibana();

  const { fieldName, isTopValuesSampled, topValues, sampleCount } = stats!;

  const layerList: VectorLayerDescriptor[] = useMemo(
    () => [getChoroplethTopValuesLayer(fieldName || '', topValues || [], suggestion)],
    [suggestion, fieldName, topValues]
  );

  if (!stats) return null;

  const totalDocuments = stats.totalDocuments ?? sampleCount ?? 0;

  const countsElement = totalDocuments ? (
    <EuiText color="subdued" size="xs">
      {isTopValuesSampled ? (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.choroplethMapTopValues.calculatedFromSampleRecordsLabel"
          defaultMessage="Calculated from {sampledDocumentsFormatted} sample {sampledDocuments, plural, one {record} other {records}}."
          values={{
            sampledDocuments: sampleCount,
            sampledDocumentsFormatted: (
              <strong>
                {fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(sampleCount)}
              </strong>
            ),
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.fieldExpandedRow.choroplethMapTopValues.calculatedFromTotalRecordsLabel"
          defaultMessage="Calculated from {totalDocumentsFormatted} {totalDocuments, plural, one {record} other {records}}."
          values={{
            totalDocuments,
            totalDocumentsFormatted: (
              <strong>
                {fieldFormats
                  .getDefaultInstance(KBN_FIELD_TYPES.NUMBER, [ES_FIELD_TYPES.INTEGER])
                  .convert(totalDocuments ?? 0)}
              </strong>
            ),
          }}
        />
      )}
    </EuiText>
  ) : null;

  return (
    <ExpandedRowPanel
      dataTestSubj={'fileDataVisualizerChoroplethMapTopValues'}
      className={'dvPanel__wrapper'}
      grow={true}
    >
      <div className={'dvMap__wrapper'}>
        <EmbeddedMapComponent layerList={layerList} />
      </div>

      {countsElement}
    </ExpandedRowPanel>
  );
};
