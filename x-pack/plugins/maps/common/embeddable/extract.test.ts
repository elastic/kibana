/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extract } from './extract';
import { MapEmbeddablePersistableState } from './types';

test('Should return original state and empty references with by-reference embeddable state', () => {
  const mapByReferenceInput = {
    id: '2192e502-0ec7-4316-82fb-c9bbf78525c4',
    type: 'map',
  };

  expect(extract!(mapByReferenceInput)).toEqual({
    state: mapByReferenceInput,
    references: [],
  });
});

test('Should update state with refNames with by-value embeddable state', () => {
  const mapByValueInput = {
    id: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20',
    attributes: {
      title: '',
      description: '',
      layerListJSON:
        '[{"sourceDescriptor":{"indexPatternId":"90943e30-9a47-11e8-b64d-95841ca0b247","geoField":"geo.coordinates","scalingType":"MVT","id":"7b5ec78e-a8b1-41f6-adf3-67b070f23227","type":"ES_SEARCH","applyGlobalQuery":true,"applyGlobalTime":true,"applyForceRefresh":true,"filterByMapBounds":true,"tooltipProperties":[],"sortField":"","sortOrder":"desc","topHitsSplitField":"","topHitsSize":1},"id":"262924df-33da-4433-9885-c5127af603a5","label":null,"minZoom":0,"maxZoom":24,"alpha":0.75,"visible":true,"style":{"type":"VECTOR","properties":{"icon":{"type":"STATIC","options":{"value":"marker"}},"fillColor":{"type":"STATIC","options":{"color":"#54B399"}},"lineColor":{"type":"STATIC","options":{"color":"#41937c"}},"lineWidth":{"type":"STATIC","options":{"size":1}},"iconSize":{"type":"STATIC","options":{"size":6}},"iconOrientation":{"type":"STATIC","options":{"orientation":0}},"labelText":{"type":"STATIC","options":{"value":""}},"labelColor":{"type":"STATIC","options":{"color":"#000000"}},"labelSize":{"type":"STATIC","options":{"size":14}},"labelBorderColor":{"type":"STATIC","options":{"color":"#FFFFFF"}},"symbolizeAs":{"options":{"value":"circle"}},"labelBorderSize":{"options":{"size":"SMALL"}}},"isTimeAware":true},"includeInFitToBounds":true,"type":"MVT_VECTOR","joins":[]}]',
      mapStateJSON:
        '{"zoom":2.98,"center":{"lon":-121.54937,"lat":49.63178},"timeFilters":{"from":"now-15m","to":"now"},"refreshConfig":{"isPaused":true,"interval":0},"query":{"query":"","language":"kuery"},"filters":[],"settings":{"autoFitToDataBounds":false,"backgroundColor":"#ffffff","disableInteractive":false,"disableTooltipControl":false,"hideToolbarOverlay":false,"hideLayerControl":false,"hideViewControl":false,"initialLocation":"LAST_SAVED_LOCATION","fixedLocation":{"lat":0,"lon":0,"zoom":2},"browserLocation":{"zoom":2},"maxZoom":24,"minZoom":0,"showScaleControl":false,"showSpatialFilters":true,"showTimesliderToggleButton":true,"spatialFiltersAlpa":0.3,"spatialFiltersFillColor":"#DA8B45","spatialFiltersLineColor":"#DA8B45"}}',
      uiStateJSON: '{"isLayerTOCOpen":true,"openTOCDetails":[]}',
    },
    type: 'map',
  };

  const { state, references } = extract!(mapByValueInput);
  expect(references).toEqual([
    {
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20_layer_0_source_index_pattern',
      type: 'index-pattern',
    },
  ]);

  const layerList = JSON.parse(((state as MapEmbeddablePersistableState).attributes.layerListJSON as string));
  expect(layerList[0].sourceDescriptor.indexPatternRefName).toEqual(
    '8d62c3f0-c61f-4c09-ac24-9b8ee4320e20_layer_0_source_index_pattern'
  );
});
