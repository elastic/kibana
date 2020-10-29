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
import sample from './sample.json';

// VegaDeckGl.use(vega, deck, layers, luma);

const CANVAS_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '1000px',
  height: '1000px',
  border: 'red solid 5px',
  'z-index': 10000,
};

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

const signalChangeFactory = (mbMap) => (sig, value) => {
  try {
    const center = mbMap.getCenter();
    let zoom = mbMap.getZoom();

    switch (sig) {
      case 'latitude':
        center.lat = value;
        break;
      case 'longitude':
        center.lng = value;
        break;
      case 'zoom':
        zoom = value;
        break;
      default:
        return; // ignore
    }

    // mbMap.flyTo({ center, zoom });
  } catch (err) {
    console.error(err);
  }
};

export const getCanvas = () => {
  const deckCanvas = document.createElement('div');
  Object.assign(deckCanvas.style, CANVAS_STYLE);
  return deckCanvas;
};

export const createMapboxLayer = async function (mbMap, mbLayerId) {
  const deckCanvas = getCanvas();
  const augmentedSpec = augmentSpec(sample);
  const onSignal = signalChangeFactory(mbMap);

  // Parse spec and generate
  const parsedVega = vega.parse(sample); // Std
  const view = new vega.View(parsedVega)
    .renderer('canvas') // renderer (canvas or svg)
    .width(1000)
    .height(1000)
    .initialize(deckCanvas) // parent DOM container
    .hover(true); // enable hover processing
  await view.runAsync();
  return deckCanvas.childNodes[0];
  // return new MapboxLayer({ id: mbLayerId, deck: deckGlLayer });
};
