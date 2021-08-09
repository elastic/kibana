/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { AddConfigDeprecation } from '@kbn/config';
import { PluginInitializerContext } from 'src/core/server';
import { PluginConfigDescriptor } from 'kibana/server';
import { MapsPlugin } from './plugin';
import { configSchema, MapsXPackConfig } from '../config';

export const config: PluginConfigDescriptor<MapsXPackConfig> = {
  // exposeToBrowser specifies kibana.yml settings to expose to the browser
  // the value `true` in this context signals configuration is exposed to browser
  exposeToBrowser: {
    enabled: true,
    showMapVisualizationTypes: true,
    showMapsInspectorAdapter: true,
    preserveDrawingBuffer: true,
  },
  schema: configSchema,
  deprecations: () => [
    (
      completeConfig: Record<string, any>,
      rootPath: string,
      addDeprecation: AddConfigDeprecation
    ) => {
      if (_.get(completeConfig, 'xpack.maps.showMapVisualizationTypes') === undefined) {
        return completeConfig;
      }
      addDeprecation({
        message: i18n.translate('xpack.maps.deprecation.showMapVisualizationTypes.message', {
          defaultMessage:
            'xpack.maps.showMapVisualizationTypes is deprecated and is no longer used',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.maps.deprecation.showMapVisualizationTypes.step1', {
              defaultMessage:
                'Remove "xpack.maps.showMapVisualizationTypes" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
            }),
          ],
        },
      });
      return completeConfig;
    },
    (
      completeConfig: Record<string, any>,
      rootPath: string,
      addDeprecation: AddConfigDeprecation
    ) => {
      if (_.get(completeConfig, 'map.proxyElasticMapsServiceInMaps') === undefined) {
        return completeConfig;
      }
      addDeprecation({
        documentationUrl:
          'https://www.elastic.co/guide/en/kibana/current/maps-connect-to-ems.html#elastic-maps-server',
        message: i18n.translate('xpack.maps.deprecation.proxyEMS.message', {
          defaultMessage: 'map.proxyElasticMapsServiceInMaps is deprecated and is no longer used',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.maps.deprecation.proxyEMS.step1', {
              defaultMessage:
                'Remove "map.proxyElasticMapsServiceInMaps" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
            }),
            i18n.translate('xpack.maps.deprecation.proxyEMS.step2', {
              defaultMessage: 'Host Elastic Maps Service locally.',
            }),
          ],
        },
      });
      return completeConfig;
    },
    (
      completeConfig: Record<string, any>,
      rootPath: string,
      addDeprecation: AddConfigDeprecation
    ) => {
      if (_.get(completeConfig, 'map.regionmap') === undefined) {
        return completeConfig;
      }
      addDeprecation({
        message: i18n.translate('xpack.maps.deprecation.regionmap.message', {
          defaultMessage: 'map.regionmap is deprecated and is no longer used',
        }),
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.maps.deprecation.regionmap.step1', {
              defaultMessage:
                'Remove "map.regionmap" in the Kibana config file, CLI flag, or environment variable (in Docker only).',
            }),
            i18n.translate('xpack.maps.deprecation.regionmap.step2', {
              defaultMessage:
                'Use "Upload GeoJSON" to upload each layer defined by "map.regionmap.layers".',
            }),
            i18n.translate('xpack.maps.deprecation.regionmap.step3', {
              defaultMessage:
                'Update all maps with "Configured GeoJSON" layers. Use Choropleth layer wizard to build a replacement layer. Delete "Configured GeoJSON" layer from your map.',
            }),
          ],
        },
      });
      return completeConfig;
    },
  ],
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsPlugin(initializerContext);
