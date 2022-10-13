/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BreadcrumbTrail } from '../../../shared/kibana_chrome/generate_breadcrumbs';
import { generateEncodedPath } from '../../utils/encode_path_params';

import { ENGINES_TITLE } from '../engines';

import { EngineLogic } from '.';

/**
 * Generate a path with engineName automatically filled from EngineLogic state
 */
export const generateEnginePath = (path: string, pathParams: object = {}) => {
  const { engineName } = EngineLogic.values;
  return generateEncodedPath(path, { engineName, ...pathParams });
};

/**
 * Generate a breadcrumb trail with engineName automatically filled from EngineLogic state
 */
export const getEngineBreadcrumbs = (breadcrumbs: BreadcrumbTrail = []) => {
  const { engineName } = EngineLogic.values;
  return [ENGINES_TITLE, engineName, ...breadcrumbs];
};
