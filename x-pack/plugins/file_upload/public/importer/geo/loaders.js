/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Loading @loaders.gl from javascriopt file to typescript compilation failures within @loaders.gl.
export { JSONLoader } from '@loaders.gl/json';
export { _BrowserFileSystem as BrowserFileSystem, loadInBatches } from '@loaders.gl/core';
export { DBFLoader, ShapefileLoader } from '@loaders.gl/shapefile';
