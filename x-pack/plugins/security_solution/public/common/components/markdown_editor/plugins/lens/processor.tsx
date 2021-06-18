/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';

import { createGlobalStyle } from '../../../../../../../../../src/plugins/kibana_react/common';
import { EmbeddableComponentProps, TypedLensByValueInput } from '../../../../../../../lens/public';
import { useKibana } from '../../../../lib/kibana';
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
  id?: string | null;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  onBrushEnd?: EmbeddableComponentProps['onBrushEnd'];
}

const LensMarkDownRendererComponent: React.FC<LensMarkDownRendererProps> = ({
  attributes,
  title,
  startDate,
  endDate,
  onBrushEnd,
}) => {
  const location = useLocation();
  const {
    EmbeddableComponent,
    navigateToPrefilledEditor,
    canUseEditor,
  } = useKibana().services.lens;

  console.error('loaa', location);

  console.error('sss', attributes, canUseEditor());
  return (
    <Container>
      {attributes ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                <h5>{title}</h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="lensApp"
                fullWidth={false}
                isDisabled={!canUseEditor() || attributes === null}
                onClick={() => {
                  if (attributes) {
                    navigateToPrefilledEditor(
                      {
                        id: '',
                        timeRange: {
                          from: startDate ?? 'now-5d',
                          to: endDate ?? 'now',
                          mode: startDate ? 'absolute' : 'relative',
                        },
                        attributes: {
                          ...attributes.attributes,
                          references: attributes.references,
                        },
                      },
                      {
                        originatingApp: 'securitySolution:case',
                        originatingPath: `${location.pathname}${location.search}`,
                      }
                    );
                  }
                }}
              >
                {`Open in Lens`}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          {attributes ? (
            <EmbeddableComponent
              id=""
              style={{ height: LENS_VISUALIZATION_HEIGHT }}
              timeRange={{
                from: startDate ?? 'now-5d',
                to: endDate ?? 'now',
                mode: startDate ? 'absolute' : 'relative',
              }}
              attributes={{
                ...attributes.attributes,
                references: attributes.references,
              }}
              onBrushEnd={onBrushEnd}
            />
          ) : null}
          <LensChartTooltipFix />
        </>
      ) : null}
    </Container>
  );
};

export const LensMarkDownRenderer = React.memo(LensMarkDownRendererComponent);
