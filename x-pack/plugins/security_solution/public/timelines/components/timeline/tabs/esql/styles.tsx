/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import { createGlobalStyle } from 'styled-components';

export const EmbeddedDiscoverContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: scroll;
  display: grid,
  place-items: center
`;

// TODO remember to remove the className added to discover/public/components/discover_grid_flyout/discover_grid_flyout.tsx when removing this
export const TimelineESQLGlobalStyles = createGlobalStyle`
  body:has(.timeline-portal-overlay-mask) .DiscoverFlyout {
    z-index: 1002; // For its usage in the Security Solution timeline, we need Discover flyout to be above the timeline flyout (which has a z-index of 1001)
  }

  // TODO this should be removed when we change the ES|QL tab to be our own component instead of Discover (hopefully 8.15)
  .unifiedDataTable__fullScreen .dscPageBody * {
    z-index: unset !important;
  }
`;
