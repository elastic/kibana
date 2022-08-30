/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import dedent from 'dedent';

import { ElasticsearchIndexWithPrivileges } from '../../../../../common/types';
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
  indices: ElasticsearchIndexWithPrivileges[],
  selectedIndexName: string
): SearchIndexSelectableOption[] => {
  return indices
    .filter(({ alias, privileges }) => {
      if (alias) {
        return privileges.manage;
      } else {
        return privileges.read && privileges.manage;
      }
    })
    .map((index) => {
      let icon;
      let color;
      let toolTipTitle;
      let toolTipContent;

      if (index.name.startsWith('search-')) {
        color = 'success';

        if (index.alias) {
          toolTipTitle = 'Alias is compatible';
          toolTipContent = 'You can use this alias.';
        } else {
          toolTipTitle = 'Index name is compatible';
          toolTipContent = dedent(`
          You can directly use this index. You can also optionally create an
          alias to use as the source of the engine instead.
        `);
        }
      } else {
        if (index.alias) {
          icon = 'alert';
          color = 'danger';
          toolTipTitle = 'Alias name is incompatible';
          toolTipContent = 'You\'ll have to create a new alias prefixed with "search-".';
        } else {
          icon = 'iInCircle';
          color = 'warning';
          toolTipTitle = 'Index name is incompatible';
          toolTipContent = dedent(`
          Enterprise Search will automatically create an alias to use as the
          source of the search engine rather than use this index directly.
        `);
        }
      }

      return {
        ...(selectedIndexName === index.name ? { checked: 'on' } : {}),
        alias: index.alias,
        badge: {
          color,
          toolTipTitle,
          toolTipContent,
          label: index.alias ? 'Alias' : 'Index',
          ...(icon ? { icon } : {}),
        },
        count: index.count,
        disabled: index.alias && !index.name.startsWith('search-'),
        label: index.name,
        health: index.health,
        status: index.status,
        total: index.total,
      };
    });
};
