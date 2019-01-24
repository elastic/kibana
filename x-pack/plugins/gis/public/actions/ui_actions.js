/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const RESET_LAYER_LOAD = 'RESET_LAYER_LOAD';

export const resetLayerLoad = () => {
  return {
    type: RESET_LAYER_LOAD
  };
};
