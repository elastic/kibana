/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Creates URL to the Data Visualizer page
 */
import { DataVisualizerUrlState, MlGenericUrlState } from '../../common/types/ml_url_generator';
import { createIndexBasedMlUrl } from './common';

export function createDataVisualizerUrl(
  appBasePath: string,
  { page }: DataVisualizerUrlState
): string {
  return `${appBasePath}/${page}`;
}

/**
 * Creates URL to the Index Data Visualizer
 */
export function createIndexDataVisualizerUrl(
  appBasePath: string,
  mlGenericUrlState: MlGenericUrlState
): string {
  return createIndexBasedMlUrl(appBasePath, mlGenericUrlState);
}
