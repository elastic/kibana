/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

export const useGetStatefulQueryBar = () => {
  const {
    services: {
      navigation: {
        ui: { createTopNavWithCustomContext },
      },
      unifiedSearch,
      customDataService,
    },
  } = useKibana();

  const {
    ui: { getCustomSearchBar },
  } = unifiedSearch;

  const CustomSearchBar = useMemo(
    () => getCustomSearchBar(customDataService),
    [customDataService, getCustomSearchBar]
  );

  const CustomStatefulTopNavKqlQueryBar = useMemo(() => {
    const customUnifiedSearch = {
      ...unifiedSearch,
      ui: {
        ...unifiedSearch.ui,
        SearchBar: CustomSearchBar,
        AggregateQuerySearchBar: CustomSearchBar,
      },
    };

    return createTopNavWithCustomContext(customUnifiedSearch);
  }, [CustomSearchBar, createTopNavWithCustomContext, unifiedSearch]);

  return {
    CustomStatefulTopNavKqlQueryBar,
  };
};
