/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LayoutTypes } from '../../../common/constants';
import { Layout } from './layout';
import { Optimizedlayout } from './optimized_layout';
import { Preservelayout } from './preserve_layout';

// you'll notice that we aren't passing the zoom at this time, while it'd be possible to use
// window.pixelDensity to figure out what the current user is seeing, if they're going to send the
// PDF to someone else, I can see there being benefit to using a higher pixel density, so we're
// going to leave this hard-coded for the time being

interface Layoutparams {
  id: string;
  dimensions: {
    height: number;
    width: number;
  };
}

export function getlayout(server: string, LayoutParamsin: Layoutparams, zoom: number = 2): Layout {
  if (LayoutParamsin && LayoutParamsin.id === LayoutTypes.PRESERVE_LAYOUT) {
    return new Preservelayout(
      server,
      LayoutParamsin.id,
      LayoutParamsin.dimensions.height,
      LayoutParamsin.dimensions.width,
      zoom
    );
  }

  // this is the default because some jobs won't have anything specified
  return new Optimizedlayout(server, LayoutParamsin.id);
}
