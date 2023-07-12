/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import styled from 'styled-components';
import { useGetStatefulQueryBar } from '../../../../common/hooks/use_get_stateful_query_bar';
import { useKibana } from '../../../../common/lib/kibana';

const EmbeddedDiscoverContainer = styled.div`
  width: 100%;
  overflow: scroll;
`;

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: { customDataService: discoverDataService, discover, discoverFilterManager },
  } = useKibana();

  const { useDiscoverMainRoute } = discover;

  const { CustomStatefulTopNavKqlQueryBar } = useGetStatefulQueryBar();

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
        CustomQueryBar: CustomStatefulTopNavKqlQueryBar,
      });

      customizations.set({
        id: 'top_nav',
        showBreadcrumbs: false,
      });
    },
    [CustomStatefulTopNavKqlQueryBar]
  );

  return (
    <EmbeddedDiscoverContainer>
      <DiscoverMainRoute isDev={false} customizationCallbacks={[customizationCallback]} />
    </EmbeddedDiscoverContainer>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
