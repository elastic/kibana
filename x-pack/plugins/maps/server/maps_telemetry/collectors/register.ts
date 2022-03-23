/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getMapsTelemetry, MapsUsage } from '../maps_telemetry';

export function registerMapsUsageCollector(usageCollection?: UsageCollectionSetup): void {
  if (!usageCollection) {
    return;
  }

  const mapsUsageCollector = usageCollection.makeUsageCollector<MapsUsage>({
    type: 'maps',
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(),
    schema: {
      indexPatternsWithGeoFieldCount: { type: 'long' },
      indexPatternsWithGeoPointFieldCount: { type: 'long' },
      indexPatternsWithGeoShapeFieldCount: { type: 'long' },
      geoShapeAggLayersCount: { type: 'long' },
      mapsTotalCount: { type: 'long' },
      timeCaptured: { type: 'date' },
      layerTypes: {
        ems_basemap: {
          min: { type: 'long', _meta: { description: 'min number of ems basemap layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of ems basemap layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ems basemap layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of ems basemap layers in cluster' },
          },
        },
        ems_region: {
          min: { type: 'long', _meta: { description: 'min number of ems file layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of ems file layers per map' } },
          avg: { type: 'float', _meta: { description: 'avg number of ems file layers per map' } },
          total: {
            type: 'long',
            _meta: { description: 'total number of file layers in cluster' },
          },
        },
        es_agg_clusters: {
          min: { type: 'long', _meta: { description: 'min number of es cluster layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es cluster layers per map' } },
          avg: { type: 'float', _meta: { description: 'avg number of es cluster layers per map' } },
          total: {
            type: 'long',
            _meta: { description: 'total number of es cluster layers in cluster' },
          },
        },
        es_agg_grids: {
          min: { type: 'long', _meta: { description: 'min number of es grid layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es grid layers per map' } },
          avg: { type: 'float', _meta: { description: 'avg number of es grid layers per map' } },
          total: {
            type: 'long',
            _meta: { description: 'total number of es grid layers in cluster' },
          },
        },
        es_agg_hexagons: {
          min: { type: 'long', _meta: { description: 'min number of es hexagon layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es hexagon layers per map' } },
          avg: { type: 'float', _meta: { description: 'avg number of es hexagon layers per map' } },
          total: {
            type: 'long',
            _meta: { description: 'total number of es hexagon layers in cluster' },
          },
        },
        es_agg_heatmap: {
          min: { type: 'long', _meta: { description: 'min number of es heatmap layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es heatmap layers  per map' } },
          avg: { type: 'float', _meta: { description: 'avg number of es heatmap layers per map' } },
          total: {
            type: 'long',
            _meta: { description: 'total number of es heatmap layers in cluster' },
          },
        },
        es_top_hits: {
          min: { type: 'long', _meta: { description: 'min number of es top hits layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es top hits layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es top hits layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of es top hits layers in cluster' },
          },
        },
        es_docs: {
          min: { type: 'long', _meta: { description: 'min number of es document layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es document layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es document layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of es document layers in cluster' },
          },
        },
        es_point_to_point: {
          min: {
            type: 'long',
            _meta: { description: 'min number of es point-to-point layers per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of es point-to-point layers per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es point-to-point layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of es point-to-point layers in cluster' },
          },
        },
        es_tracks: {
          min: { type: 'long', _meta: { description: 'min number of es track layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of es track layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es track layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of es track layers in cluster' },
          },
        },
        kbn_tms_raster: {
          min: { type: 'long', _meta: { description: 'min number of kbn tms layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of kbn tms layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of kbn tms layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of kbn tms layers in cluster' },
          },
        },
        ux_tms_mvt: {
          min: { type: 'long', _meta: { description: 'min number of ux tms-mvt layers per map' } },
          max: { type: 'long', _meta: { description: 'max number of ux tms-mvt layers per map' } },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ux tms-mvt layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of ux tms-mvt layers in cluster' },
          },
        },
        ux_tms_raster: {
          min: {
            type: 'long',
            _meta: { description: 'min number of ux tms-raster layers per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of ux tms-raster layers per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ux tms-raster layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of ux-tms raster layers in cluster' },
          },
        },
        ux_wms: {
          min: {
            type: 'long',
            _meta: { description: 'min number of ux wms layers per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of ux wms layers per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ux wms layers per map' },
          },
          total: {
            type: 'long',
            _meta: { description: 'total number of ux wms layers in cluster' },
          },
        },
      },
      scalingOptions: {
        limit: {
          min: {
            type: 'long',
            _meta: { description: 'min number of es doc layers with limit scaling option per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of es doc layers with limit scaling option per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es doc layers with limit scaling option per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of es doc layers with limit scaling option in cluster',
            },
          },
        },
        clusters: {
          min: {
            type: 'long',
            _meta: {
              description: 'min number of es doc layers with blended scaling option per map',
            },
          },
          max: {
            type: 'long',
            _meta: {
              description: 'max number of es doc layers with blended scaling option per map',
            },
          },
          avg: {
            type: 'float',
            _meta: {
              description: 'avg number of es doc layers with blended scaling option per map',
            },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of es doc layers with blended scaling option in cluster',
            },
          },
        },
        mvt: {
          min: {
            type: 'long',
            _meta: { description: 'min number of es doc layers with mvt scaling option per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of es doc layers with mvt scaling option per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of es doc layers with mvt scaling option per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of es doc layers with mvt scaling option in cluster',
            },
          },
        },
      },
      resolutions: {
        coarse: {
          min: {
            type: 'long',
            _meta: { description: 'min number of grid-agg layers with coarse resolution' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of grid-agg layers with coarse resolution' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of grid-agg layers with coarse resolution' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of grid-agg layers with coarse resolution',
            },
          },
        },
        fine: {
          min: {
            type: 'long',
            _meta: { description: 'min number of grid-agg layers with fine resolution' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of grid-agg layers with fine resolution' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of grid-agg layers with fine resolution' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of grid-agg layers with fine resolution',
            },
          },
        },
        most_fine: {
          min: {
            type: 'long',
            _meta: { description: 'min number of grid-agg layers with most_fine resolution' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of grid-agg layers with most_fine resolution' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of grid-agg layers with most_fine resolution' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of grid-agg layers with most_fine resolution',
            },
          },
        },
        super_fine: {
          min: {
            type: 'long',
            _meta: { description: 'min number of grid-agg layers with super_fine resolution' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of grid-agg layers with super_fine resolution' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of grid-agg layers with super_fine resolution' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of grid-agg layers with super_fine resolution',
            },
          },
        },
      },
      joins: {
        term: {
          min: {
            type: 'long',
            _meta: { description: 'min number of layers with term joins per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of layers with term joins per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of layers with term joins per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of layers with term joins in cluster',
            },
          },
        },
      },
      basemaps: {
        auto: {
          min: {
            type: 'long',
            _meta: { description: 'min number of ems basemap layers with auto-style per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of ems basemap layers with auto-style per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ems basemap layers with auto-style per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of ems basemap layers with auto-style in cluster',
            },
          },
        },
        dark: {
          min: {
            type: 'long',
            _meta: { description: 'min number of ems basemap layers with dark-style per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of ems basemap layers with dark-style per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ems basemap layers with dark-style per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of ems basemap layers with dark-style in cluster',
            },
          },
        },
        roadmap: {
          min: {
            type: 'long',
            _meta: { description: 'min number of ems basemap layers with roadmap-style per map' },
          },
          max: {
            type: 'long',
            _meta: { description: 'max number of ems basemap layers with roadmap-style per map' },
          },
          avg: {
            type: 'float',
            _meta: { description: 'avg number of ems basemap layers with roadmap-style per map' },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of ems basemap layers with roadmap-style in cluster',
            },
          },
        },
        roadmap_desaturated: {
          min: {
            type: 'long',
            _meta: {
              description: 'min number of ems basemap layers with desaturated-style per map',
            },
          },
          max: {
            type: 'long',
            _meta: {
              description: 'max number of ems basemap layers with desaturated-style per map',
            },
          },
          avg: {
            type: 'float',
            _meta: {
              description: 'avg number of ems basemap layers with desaturated-style per map',
            },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'total number of ems basemap layers with desaturated-style in cluster',
            },
          },
        },
      },
      attributesPerMap: {
        dataSourcesCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        layersCount: {
          min: { type: 'long' },
          max: { type: 'long' },
          avg: { type: 'float' },
        },
        // TODO: Find out all the possible values for DYNAMIC_KEY or reformat into an array
        layerTypesCount: {
          DYNAMIC_KEY: { min: { type: 'long' }, max: { type: 'long' }, avg: { type: 'float' } },
        },
        emsVectorLayersCount: {
          DYNAMIC_KEY: { min: { type: 'long' }, max: { type: 'long' }, avg: { type: 'float' } },
        },
      },
    },
  });

  usageCollection.registerCollector(mapsUsageCollector);
}
