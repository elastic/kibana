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
import { ML_PAGES } from '../../common/constants/ml_url_generator';

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
  pageState: MlGenericUrlState['pageState']
): string {
  return createIndexBasedMlUrl(appBasePath, ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER, pageState);
}
