/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITileLayerArguments, TileLayer } from '../tile_layer/tile_layer';

export class VectorTileLayer extends TileLayer {
  static type: string;
  constructor(args: ITileLayerArguments);
}
