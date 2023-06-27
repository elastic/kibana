/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import { useKibana } from '../../../../common/lib/kibana';

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: {
      unifiedSearch,
      navigation: {
        ui: { createTopNavWithCustomContext },
      },
      discoverDataService,
      discover,
      discoverFilterManager,
    },
  } = useKibana();

  const {
    ui: { getCustomSearchBar },
  } = unifiedSearch;

  const { useDiscoverMainRoute } = discover;

  const CustomStatefulTopMenu = useMemo(() => {
    const CustomSearchBar = getCustomSearchBar({
      data: discoverDataService,
    });

    const customUnifiedSearch = {
      ...unifiedSearch,
      ui: {
        ...unifiedSearch.ui,
        SearchBar: CustomSearchBar,
        AggregateQuerySearchBar: CustomSearchBar,
      },
    };

    return createTopNavWithCustomContext(customUnifiedSearch);
  }, [discoverDataService, getCustomSearchBar, createTopNavWithCustomContext, unifiedSearch]);

  const getDiscoverLayout = useDiscoverMainRoute({
    services: {
      filterManager: discoverFilterManager,
      data: discoverDataService,
    },
  });

  const DiscoverMainRoute = getDiscoverLayout(history);

  const customizationCallback: CustomizationCallback = useCallback(
    ({ customizations, stateContainer }) => {
      customizations.set({
        id: 'search_bar',
        CustomQueryBar: CustomStatefulTopMenu,
      });

      customizations.set({
        id: 'top_nav',
        showBreadcrumbs: false,
      });
    },
    [CustomStatefulTopMenu]
  );

  return (
    <div
      css={css`
        width: 100%;
        overflow: scroll;
      `}
    >
      <DiscoverMainRoute isDev={false} customizationCallbacks={[customizationCallback]} />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
