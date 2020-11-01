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

export const createMapboxLayer = async function (mbMap, mbLayerId) {
  const width = mbMap.getCanvas().clientWidth;
  const height = mbMap.getCanvas().clientHeight;
  const center = mbMap.getCenter();
  const zoom = mbMap.getZoom();

  const deckCanvas = getCanvas(width, height);
  const augmentedSpec = augmentSpec(sample);
  const onSignal = signalChangeFactory(mbMap);

  // Parse spec and generate
  const parsedVega = vega.parse(augmentedSpec); // Std
  const view = new vega.View(parsedVega)
    // .logLevel(vega.Debug)
    // .addSignalListener('latitude', onSignal)
    // .addSignalListener('longitude', onSignal)
    // .addSignalListener('zoom', onSignal)
    .renderer('canvas') // renderer (canvas or svg)
    .signal('latitude', center.lat)
    .signal('longitude', center.lng)
    .signal('zoom', zoom + 1)
    .width(width)
    .height(height)
    .initialize(deckCanvas) // parent DOM container
    .hover(true); // enable hover processing

  await view.runAsync();
  vegaDebug(view, augmentedSpec);
  return {
    view,
    canvas: deckCanvas.childNodes[0]
  };
  // return new MapboxLayer({ id: mbLayerId, deck: deckGlLayer });
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
