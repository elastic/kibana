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
import { useDiscoverCustomizationServiceForSecuritySolution } from '../../../../app/discover_customization_provider';
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
      data,
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

    return createTopNavWithCustomContext({
      ...unifiedSearch,
      ui: {
        ...unifiedSearch.ui,
        SearchBar: CustomSearchBar,
        AggregateQuerySearchBar: CustomSearchBar,
      },
    });
  }, [discoverDataService, getCustomSearchBar, createTopNavWithCustomContext, unifiedSearch]);

  const getDiscoverLayout = useDiscoverMainRoute({
    services: {
      filterManager: discoverFilterManager,
      data: discoverDataService,
    },
  });

  const DiscoverMainRoute = getDiscoverLayout(history);

  const { setDiscoverStateContainer, discoverStateContainer } =
    useDiscoverCustomizationServiceForSecuritySolution();

  const customizationCallback: CustomizationCallback = useCallback(
    ({ customizations, stateContainer }) => {
      // if (!discoverStateContainer) setDiscoverStateContainer(stateContainer);
      customizations.set({
        id: 'search_bar',
        CustomQueryBar: CustomStatefulTopMenu,
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
