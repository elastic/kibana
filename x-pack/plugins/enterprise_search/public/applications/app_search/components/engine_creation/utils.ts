/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import { ElasticsearchIndex } from '../../../../../common/types';
import { ENGINE_CRAWLER_PATH, ENGINE_PATH } from '../../routes';

import { HealthStrings, SearchIndexSelectableOption } from './search_index_selectable';

export const getRedirectToAfterEngineCreation = ({
  ingestionMethod,
  engineName,
}: {
  ingestionMethod?: string;
  engineName: string;
}): string => {
  if (ingestionMethod === 'crawler') {
    return generatePath(ENGINE_CRAWLER_PATH, { engineName });
  }

  let enginePath = generatePath(ENGINE_PATH, { engineName });
  if (ingestionMethod) {
    enginePath += `?method=${encodeURIComponent(ingestionMethod)}`;
  }

  return enginePath;
};

export const formatIndicesToSelectable = (
  indices: ElasticsearchIndex[],
  selectedIndexName: string
): SearchIndexSelectableOption[] => {
  return indices.map((index) => ({
    ...(selectedIndexName === index.name ? { checked: 'on' } : {}),
    label: index.name,
    health: (index.health as HealthStrings) ?? 'unavailable',
    status: index.status,
    total: index.total,
  }));
};
