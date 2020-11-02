/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import * as deck from '@deck.gl/core';
// import * as layers from '@deck.gl/layers';
// import * as luma from 'luma.gl';
import * as vega from 'vega';
// import * as VegaDeckGl from '@msrvida/vega-deck.gl';
import { MapboxLayer } from '@deck.gl/mapbox';
import Vsi from 'vega-spec-injector';
// import sample from './sample.json';
import sample from './flights_sample.json';

// VegaDeckGl.use(vega, deck, layers, luma);

const DEFAULT_PROJECTION = {
  name: 'projection',
  type: 'mercator',
  scale: { signal: '256*pow(2,zoom)/2/PI' },
  rotate: [{ signal: '-longitude' }, 0, 0],
  center: [0, { signal: 'latitude' }],
  translate: [{ signal: 'width/2' }, { signal: 'height/2' }],
  fit: false,
};

const augmentSpec = (spec) => {
  // Inject signals into the spec
  const vsi = new Vsi();
  vsi.overrideField(spec, 'padding', 0);
  vsi.overrideField(spec, 'autosize', 'none');
  vsi.addToList(spec, 'signals', ['zoom', 'latitude', 'longitude']);
  vsi.addToList(spec, 'projections', [DEFAULT_PROJECTION]);
  return spec;
};

const signalChangeFactory = (mbMap) => () => {
  try {
    const center = mbMap.getCenter();
    const zoom = mbMap.getZoom();

    mbMap.flyTo({ center, zoom });
  } catch (err) {
    console.error(err);
  }
};

export const getCanvas = (width, height) => {
  const deckCanvas = document.createElement('div');
  Object.assign(deckCanvas.style, { width, height });
  return deckCanvas;
};
const onChangeFactory = (mbMap, sourceId, view) => {
  return () => {
    const center = mbMap.getCenter();
    const zoom = mbMap.getZoom();
    const width = mbMap.getCanvas().clientWidth;
    const height = mbMap.getCanvas().clientHeight;
    mbMap
      .getSource(sourceId)
      .setCoordinates([
        mbMap.getBounds().getNorthWest().toArray(),
        mbMap.getBounds().getNorthEast().toArray(),
        mbMap.getBounds().getSouthEast().toArray(),
        mbMap.getBounds().getSouthWest().toArray(),
      ]);

    view
      .signal('latitude', center.lat)
      .signal('longitude', center.lng)
      .signal('zoom', zoom + 1)
      .width(width)
      .height(height)
      .run();
  };
};

const buildView = async (mbMap, augmentedSpec) => {
  const center = mbMap.getCenter();
  const zoom = mbMap.getZoom();
  const width = mbMap.getCanvas().clientWidth;
  const height = mbMap.getCanvas().clientHeight;

  const divWrappedCanvas = getCanvas(width, height);

  // Parse spec and generate
  const parsedVega = vega.parse(augmentedSpec); // Std
  const view = await new vega.View(parsedVega)
    .renderer('canvas')
    .signal('latitude', center.lat)
    .signal('longitude', center.lng)
    .signal('zoom', zoom + 1)
    .width(width)
    .height(height)
    .initialize(divWrappedCanvas) // parent DOM container
    .hover(true)
    .runAsync();
  return {
    view,
    canvas: divWrappedCanvas.childNodes[0], // Just return canvas
  };
};

export const getVegaCanvas = async function (mbMap, mbSourceId) {
  const augmentedSpec = augmentSpec(sample);
  const { view, canvas } = await buildView(mbMap, augmentedSpec);
  vegaDebug(view, augmentedSpec);

  return {
    canvas,
    bindEvents: () => bindEvents(mbMap, canvas, mbSourceId, view),
  };
};

const getEvent = function (name, x, y) {
  const evt = new MouseEvent(name, { clientX: x, clientY: y });
  evt.changedTouches = [
    {
      clientX: x || 0,
      clientY: y || 0,
    },
  ];
  return evt;
};

const bindEvents = (mbMap, canvas, mbSourceId, view) => {
  // Update view on map move and resize
  mbMap.on('moveend', onChangeFactory(mbMap, mbSourceId, view));
  mbMap.on('resize', onChangeFactory(mbMap, mbSourceId, view));

  // Pass mb mouse movement to canvas element
  mbMap.on('mousemove', (e) => {
    const { x, y } = e.point;
    canvas.dispatchEvent(getEvent('mousemove', x, y));
  });
};

function vegaDebug(view, spec) {
  if (window.VEGA_DEBUG === undefined && console) {
    console.log('%cWelcome to Kibana Vega Plugin!', 'font-size: 16px; font-weight: bold;');
    console.log(
      'You can access the Vega view with VEGA_DEBUG. ' +
      'Learn more at https://vega.github.io/vega/docs/api/debugging/.'
    );
  }
  const debugObj = {};
  window.VEGA_DEBUG = debugObj;
  window.VEGA_DEBUG.VEGA_VERSION = vega.version;
  window.VEGA_DEBUG.view = view;
  window.VEGA_DEBUG.vega_spec = spec;
}
