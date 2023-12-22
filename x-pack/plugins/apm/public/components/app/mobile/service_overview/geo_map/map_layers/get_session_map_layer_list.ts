/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMSFileSourceDescriptor,
  LayerDescriptor as BaseLayerDescriptor,
  VectorLayerDescriptor as BaseVectorLayerDescriptor,
  AGG_TYPE,
  LAYER_TYPE,
  SOURCE_TYPES,
} from '@kbn/maps-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  CLIENT_GEO_REGION_ISO_CODE,
  SESSION_ID,
} from '../../../../../../../common/es_fields/apm';
import { getLayerStyle, PalleteColors } from './get_map_layer_style';

interface VectorLayerDescriptor extends BaseVectorLayerDescriptor {
  sourceDescriptor: EMSFileSourceDescriptor;
}

const PER_COUNTRY_LAYER_ID = 'per_country';
const PER_REGION_LAYER_ID = 'per_region';
const COUNTRY_NAME = 'name';
const SESSION_PER_COUNTRY = `__kbnjoin__cardinality_of_session.id__${PER_COUNTRY_LAYER_ID}`;
const SESSION_PER_REGION = `__kbnjoin__cardinality_of_session.id__${PER_REGION_LAYER_ID}`;

const label = i18n.translate(
  'xpack.apm.serviceOverview.embeddedMap.session.metric.label',
  {
    defaultMessage: 'Sessions',
  }
);
export async function getSessionMapLayerList(
  maps: MapsStartApi | undefined,
  dataViewId: string
) {
  const basemapLayerDescriptor =
    await maps?.createLayerDescriptors?.createBasemapLayerDescriptor();

  const sessionsByCountryLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'iso2',
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: PER_COUNTRY_LAYER_ID,
          term: CLIENT_GEO_COUNTRY_ISO_CODE,
          metrics: [
            {
              type: AGG_TYPE.UNIQUE_COUNT,
              field: SESSION_ID,
              label,
            },
          ],
          indexPatternId: dataViewId,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          applyForceRefresh: true,
        },
      },
    ],
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: 'world_countries',
      tooltipProperties: [COUNTRY_NAME],
    },
    style: getLayerStyle(SESSION_PER_COUNTRY, PalleteColors.BluetoRed),
    id: uuidv4(),
    label: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.sessionCountry.metric.label',
      {
        defaultMessage: 'Sessions per country',
      }
    ),
    minZoom: 0,
    maxZoom: 2,
    alpha: 0.75,
    visible: true,
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  const sessionsByRegionLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'region_iso_code',
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: PER_REGION_LAYER_ID,
          term: CLIENT_GEO_REGION_ISO_CODE,
          metrics: [
            {
              type: AGG_TYPE.UNIQUE_COUNT,
              field: SESSION_ID,
              label,
            },
          ],
          indexPatternId: dataViewId,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          applyForceRefresh: true,
        },
      },
    ],
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: 'administrative_regions_lvl2',
      tooltipProperties: ['region_iso_code'],
    },
    style: getLayerStyle(SESSION_PER_REGION, PalleteColors.YellowtoRed),
    id: uuidv4(),
    label: i18n.translate(
      'xpack.apm.serviceOverview.embeddedMap.sessionRegion.metric.label',
      {
        defaultMessage: 'Sessions per region',
      }
    ),
    minZoom: 1,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  return [
    ...(basemapLayerDescriptor ? [basemapLayerDescriptor] : []),
    sessionsByRegionLayer,
    sessionsByCountryLayer,
  ] as BaseLayerDescriptor[];
}
