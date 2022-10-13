/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableTemplateSitewideOption } from '@elastic/eui';
import type { GlobalSearchResult } from '@kbn/global-search-plugin/common/types';
import type { SavedObjectTaggingPluginStart, Tag } from '@kbn/saved-objects-tagging-plugin/public';
import { ResultTagList } from '../components/result_tag_list';

const cleanMeta = (str: string) => (str.charAt(0).toUpperCase() + str.slice(1)).replace(/-/g, ' ');

export const resultToOption = (
  result: GlobalSearchResult,
  searchTagIds: string[],
  getTag?: SavedObjectTaggingPluginStart['ui']['getTag']
): EuiSelectableTemplateSitewideOption => {
  const { id, title, url, icon, type, meta = {} } = result;
  const { tagIds = [], categoryLabel = '' } = meta as { tagIds: string[]; categoryLabel: string };
  // only displaying icons for applications and integrations
  const useIcon = type === 'application' || type === 'integration';
  const option: EuiSelectableTemplateSitewideOption = {
    key: id,
    label: title,
    url,
    type,
    icon: { type: useIcon && icon ? icon : 'empty' },
    'data-test-subj': `nav-search-option`,
  };

  option.meta =
    type === 'application'
      ? [{ text: categoryLabel }]
      : [{ text: cleanMeta((meta.displayName as string) ?? type) }];

  if (getTag && tagIds.length) {
    // TODO #85189 - refactor to use TagList instead of getTag
    // Casting to Tag[] because we know all our IDs will be valid here, no need to check for undefined
    option.append = (
      <ResultTagList tags={tagIds.map(getTag) as Tag[]} searchTagIds={searchTagIds} />
    );
  }

  return option;
};
