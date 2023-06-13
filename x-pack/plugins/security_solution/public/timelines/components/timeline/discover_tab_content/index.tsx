/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import type { CustomizationCallback } from '@kbn/discover-plugin/public/customizations/types';
import { useDiscoverCustomizationServiceForSecuritySolution } from '../../../../app/DiscoverCustomizationsProviders';
import { useKibana } from '../../../../common/lib/kibana';
import { CustomDiscoverQueryBar } from './custom_discover_query_bar';

export const DiscoverTabContent = () => {
  const history = useHistory();
  const {
    services: { uiSettings, discover, discoverFilterManager },
  } = useKibana();
  const { useDiscoverMainRoute } = discover;
  const getDiscoverLayout = useDiscoverMainRoute({
    filterManager: discoverFilterManager,
  });
  const DiscoverLayout = getDiscoverLayout(history);
  const { setDiscoverStateContainer, discoverStateContainer } =
    useDiscoverCustomizationServiceForSecuritySolution();

  const customizationCallback: CustomizationCallback = useCallback(
    ({ customizations, stateContainer }) => {
      if (!discoverStateContainer) setDiscoverStateContainer(stateContainer);
      customizations.set({
        id: 'search_bar',
        CustomQueryBar: CustomDiscoverQueryBar,
      });
    },
    [setDiscoverStateContainer, discoverStateContainer]
  );

  return (
    <div
      css={css`
        width: 100%;
        overflow: scroll;
      `}
    >
      <DiscoverLayout isDev={false} customizationCallbacks={[customizationCallback]} />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
