/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import { ElasticsearchIndex } from '../../../../../common/types';
import { ENGINE_CRAWLER_PATH, ENGINE_PATH } from '../../routes';

import { SearchIndexSelectableOption } from './search_index_selectable';

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
  return indices.map((index) => {
    let icon, color, toolTipTitle, toolTipContent;
    if (index.name.startsWith('search-')) {
      color = 'success';
      if (index.alias) {
        toolTipTitle = 'Alias name conforms to pattern';
        toolTipContent = `
          Aliases cannot be created for other aliases. Choosing this alias will
          disable the Alias input below.
        `;
      } else {
        toolTipTitle = 'Index name conforms to pattern';
        toolTipContent = 'There is no need to specify an alias, but it is still allowed.';
      }
    } else {
      if (index.alias) {
        icon = 'alert';
        color = 'danger';
        toolTipTitle = 'Alias name does not conform to pattern';
        toolTipContent = `
          This alias is incompatible with Enterprise Search. Please choose
          another index or alias.
        `;
      } else {
        icon = 'iInCircle';
        color = 'warning';
        toolTipTitle = 'Index name does not conform to pattern';
        toolTipContent = `
          Choosing this index will require specifying an alias prefixed with
          'search-' in the Alias input below.
        `;
      }
    }

    return {
      ...(selectedIndexName === index.name ? { checked: 'on' } : {}),
      alias: index.alias,
      badge: {
        color: color,
        icon: icon,
        label: index.alias ? 'Alias' : 'Index',
        toolTipTitle: toolTipTitle,
        toolTipContent: toolTipContent,
      },
      disabled: index.alias && !index.name.startsWith('search-'),
      label: index.name,
      health: index.health,
      status: index.status,
      total: index.total,
    };
  });
};
