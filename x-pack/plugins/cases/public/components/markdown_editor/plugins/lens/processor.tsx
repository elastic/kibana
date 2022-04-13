/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { createGlobalStyle } from '../../../../../../../../src/plugins/kibana_react/common';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { useKibana } from '../../../../common/lib/kibana';
import { LENS_VISUALIZATION_HEIGHT } from './constants';

const Container = styled.div`
  min-height: ${LENS_VISUALIZATION_HEIGHT}px;
`;

// when displaying chart in modal the tooltip is render under the modal
const LensChartTooltipFix = createGlobalStyle`
  div.euiOverlayMask.euiOverlayMask--aboveHeader ~ [id^='echTooltipPortal'] {
    z-index: ${({ theme }) => theme.eui.euiZLevel7} !important;
  }
`;

interface LensMarkDownRendererProps {
  attributes: TypedLensByValueInput['attributes'] | null;
  timeRange?: TypedLensByValueInput['timeRange'];
}

const LensMarkDownRendererComponent: React.FC<LensMarkDownRendererProps> = ({
  attributes,
  timeRange,
}) => {
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
      />
      <LensChartTooltipFix />
    </Container>
  );
};
LensMarkDownRendererComponent.displayName = 'LensMarkDownRenderer';

export const LensMarkDownRenderer = React.memo(LensMarkDownRendererComponent);
