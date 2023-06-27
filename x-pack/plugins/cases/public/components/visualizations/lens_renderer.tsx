/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { createGlobalStyle } from '@kbn/kibana-react-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import type { LensProps } from './types';

const LENS_VISUALIZATION_HEIGHT = 200;

const Container = styled.div`
  min-height: ${LENS_VISUALIZATION_HEIGHT}px;
`;

// when displaying chart in modal the tooltip is render under the modal
const LensChartTooltipFix = createGlobalStyle`
  div.euiOverlayMask[data-relative-to-header=above] ~ [id^='echTooltipPortal'] {
    z-index: ${({ theme }) => theme.eui.euiZLevel7} !important;
  }
`;

const LensRendererComponent: React.FC<LensProps> = ({ attributes, timeRange }) => {
  const {
    lens: { EmbeddableComponent },
  } = useKibana().services;

  if (!attributes) {
    return null;
  }

  return (
    <Container>
      <EmbeddableComponent
        id=""
        style={{ height: LENS_VISUALIZATION_HEIGHT }}
        timeRange={timeRange}
        attributes={attributes}
        renderMode="view"
        disableTriggers
        executionContext={{
          type: 'cases',
        }}
        syncTooltips={false}
        syncCursor={false}
      />
      <LensChartTooltipFix />
    </Container>
  );
};

LensRendererComponent.displayName = 'LensRenderer';

export const LensRenderer = React.memo(LensRendererComponent);
