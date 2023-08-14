/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import styled, { createGlobalStyle } from 'styled-components';
import type { ScopedHistory } from '@kbn/core/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useGetStatefulQueryBar } from './use_get_stateful_query_bar';

const HideSearchSessionIndicatorBreadcrumbIcon = createGlobalStyle`
  [data-test-subj='searchSessionIndicator'] {
    display: none;
  }
`;

const EmbeddedDiscoverContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: scroll;
  display: grid,
  place-items: center
`;

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: { customDataService: discoverDataService, discover, discoverFilterManager },
  } = useKibana();

  const { CustomStatefulTopNavKqlQueryBar } = useGetStatefulQueryBar();

  const customize: CustomizationCallback = useCallback(
    ({ customizations }) => {
      customizations.set({
        id: 'search_bar',
        CustomSearchBar: CustomStatefulTopNavKqlQueryBar,
      });
    },
    [CustomStatefulTopNavKqlQueryBar]
  );

  const services = useMemo(
    () => ({
      filterManager: discoverFilterManager,
      data: discoverDataService,
    }),
    [discoverDataService, discoverFilterManager]
  );

  const DiscoverContainer = discover.DiscoverContainer;

  return (
    <EmbeddedDiscoverContainer data-test-subj="timeline-embedded-discover">
      <HideSearchSessionIndicatorBreadcrumbIcon />
      <DiscoverContainer
        overrideServices={services}
        scopedHistory={history as ScopedHistory}
        customize={customize}
      />
    </EmbeddedDiscoverContainer>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
