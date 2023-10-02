/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegisterFunctionDefinition } from '../../common/types';
import type { ObservabilityAIAssistantService } from '../types';
import {ObservabilityAIAssistantPluginStartDependencies} from "../types";

export function registerAddMapToDashboardFunction({
  service,
  registerFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerFunction(
    {
      name: 'add_dashboard_map',
      contexts: ['dashboards'],
      description: `Use this function to add a map to current dashboard. Always provide the field, timeField and index!`,
      descriptionForUser:
        'This function allows the assistant to add a panel to current dashboard.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: {
            type: 'string',
            description:
              'index to get the data from',
          },
          field: {
            type: 'string',
            description:
              'field containing the iso 2 letter country code',
          },
          timeField: {
            type: 'string',
            description: 'primary time field of index'
          }
        },
        required: ['index', 'field', 'timeField'],
      } as const,
    },
    async ({ arguments: { index, field, timeField }}) => {
      const config = {
        isLayerTOCOpen: true,
        mapBuffer: {minLon: -180, minLat: -66.51326, maxLon: 180, maxLat: 66.51326},
        mapCenter: {lat: 19.94277, lon: 0, zoom: 1.62},
        openTOCDetails: ['5c52d0d2-1fe2-4b1f-b181-8a5928d2c9e4'],
        attributes: {
          layerListJSON: '[{"locale":"autoselect","sourceDescriptor":{"type":"EMS_TMS","isAutoSelect":true,"lightModeDefault":"road_map_desaturated"},"id":"9e3d3f8e-25a4-4af6-8a98-22dd3ed75047","label":null,"minZoom":0,"maxZoom":24,"alpha":1,"visible":true,"style":{"type":"EMS_VECTOR_TILE","color":""},"includeInFitToBounds":true,"type":"EMS_VECTOR_TILE"},{"joins":[{"leftField":"iso2","right":{"type":"ES_TERM_SOURCE","id":"8ec8a089-5b67-4760-b5a9-b139e3da359a","term":"__FIELD__","metrics":[{"type":"count"}],"applyGlobalQuery":true,"applyGlobalTime":true,"applyForceRefresh":true,"indexPatternRefName":"layer_1_join_0_index_pattern"}}],"sourceDescriptor":{"type":"EMS_FILE","id":"world_countries","tooltipProperties":["iso2"]},"style":{"type":"VECTOR","properties":{"icon":{"type":"STATIC","options":{"value":"marker"}},"fillColor":{"type":"DYNAMIC","options":{"color":"Yellow to Red","colorCategory":"palette_0","field":{"name":"__kbnjoin__count__8ec8a089-5b67-4760-b5a9-b139e3da359a","origin":"join"},"fieldMetaOptions":{"isEnabled":true,"sigma":3},"type":"ORDINAL"}},"lineColor":{"type":"STATIC","options":{"color":"#3d3d3d"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":6}},"iconOrientation":{"type":"STATIC","options":{"orientation":0}},"labelText":{"type":"DYNAMIC","options":{"field":{"name":"__kbnjoin__count__8ec8a089-5b67-4760-b5a9-b139e3da359a","origin":"join"}}},"labelColor":{"type":"STATIC","options":{"color":"#000000"}},"labelSize":{"type":"STATIC","options":{"size":14}},"labelZoomRange":{"options":{"useLayerZoomRange":true,"minZoom":0,"maxZoom":24}},"labelBorderColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"symbolizeAs":{"options":{"value":"circle"}},"labelBorderSize":{"options":{"size":"SMALL"}},"labelPosition":{"options":{"position":"CENTER"}}},"isTimeAware":true},"id":"5c52d0d2-1fe2-4b1f-b181-8a5928d2c9e4","label":null,"minZoom":0,"maxZoom":24,"alpha":0.75,"visible":true,"includeInFitToBounds":true,"type":"GEOJSON_VECTOR","disableTooltips":false}]',
          mapStateJSON: '{"adHocDataViews":[],"zoom":1.62,"center":{"lon":0,"lat":19.94277},"timeFilters":{"from":"now-7d/d","to":"now"},"refreshConfig":{"isPaused":true,"interval":60000},"query":{"query":"","language":"kuery"},"filters":[],"settings":{"autoFitToDataBounds":false,"backgroundColor":"#ffffff","customIcons":[],"disableInteractive":false,"disableTooltipControl":false,"hideToolbarOverlay":false,"hideLayerControl":false,"hideViewControl":false,"initialLocation":"LAST_SAVED_LOCATION","fixedLocation":{"lat":0,"lon":0,"zoom":2},"browserLocation":{"zoom":2},"keydownScrollZoom":false,"maxZoom":24,"minZoom":0,"showScaleControl":false,"showSpatialFilters":true,"showTimesliderToggleButton":true,"spatialFiltersAlpa":0.3,"spatialFiltersFillColor":"#DA8B45","spatialFiltersLineColor":"#DA8B45"}}',
        }
      }

      config.attributes.layerListJSON = config.attributes.layerListJSON.replace("__FIELD__", field);
        // @ts-ignore
      window._dashboardAPI.addNewEmbeddable('map', config);

      return {
        content: {},
      };
    },
    ({ arguments: { config }}) => {


      return null;
    },
  );
}
