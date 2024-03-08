/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export const createCustomSearchBar = ({
  navigation,
  data,
  unifiedSearch,
}: {
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}) => {
  const {
    ui: { createTopNavWithCustomContext },
  } = navigation;

  const {
    ui: { getCustomSearchBar },
  } = unifiedSearch;

  const CustomSearchBar = getCustomSearchBar(data);

  const customUnifiedSearch = {
    ...unifiedSearch,
    ui: {
      ...unifiedSearch.ui,
      SearchBar: CustomSearchBar,
      AggregateQuerySearchBar: CustomSearchBar,
    },
  };

  return createTopNavWithCustomContext(customUnifiedSearch);
};
