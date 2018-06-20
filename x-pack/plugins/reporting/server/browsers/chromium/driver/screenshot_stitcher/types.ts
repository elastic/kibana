/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Dimension {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Screenshot {
  data: string;
  dimensions: Dimension;
}

export interface Logger {
  debug: (message: string) => void;
}
