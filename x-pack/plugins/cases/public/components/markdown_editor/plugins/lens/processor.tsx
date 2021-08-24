/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';

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
  id?: string | null;
  timeRange?: TypedLensByValueInput['timeRange'];
  startDate?: string | null;
  endDate?: string | null;
  viewMode?: boolean | undefined;
}

const LensMarkDownRendererComponent: React.FC<LensMarkDownRendererProps> = ({
  attributes,
  timeRange,
  viewMode = true,
}) => {
  const location = useLocation();
  const {
    application: { currentAppId$ },
    lens: { EmbeddableComponent, navigateToPrefilledEditor, canUseEditor },
  } = useKibana().services;
  const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);

  const handleClick = useCallback(() => {
    const options = viewMode
      ? {
          openInNewTab: true,
        }
      : {
          originatingApp: currentAppId,
          originatingPath: `${location.pathname}${location.search}`,
        };

    if (attributes) {
      navigateToPrefilledEditor(
        {
          id: '',
          timeRange,
          attributes,
        },
        options
      );
    }
  }, [
    attributes,
    currentAppId,
    location.pathname,
    location.search,
    navigateToPrefilledEditor,
    timeRange,
    viewMode,
  ]);

  useEffect(() => {
    const getCurrentAppId = async () => {
      const appId = await currentAppId$.pipe(first()).toPromise();
      setCurrentAppId(appId);
    };
    getCurrentAppId();
  }, [currentAppId$]);

  return (
    <Container>
      {attributes ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                <h5>{attributes.title}</h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {viewMode && canUseEditor() ? (
                <EuiButton
                  iconType="lensApp"
                  fullWidth={false}
                  isDisabled={!canUseEditor()}
                  onClick={handleClick}
                >
                  {`Open visualization`}
                </EuiButton>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

          <EmbeddableComponent
            id=""
            style={{ height: LENS_VISUALIZATION_HEIGHT }}
            timeRange={timeRange}
            attributes={attributes}
            renderMode="noInteractivity"
          />
          <LensChartTooltipFix />
        </>
      ) : null}
    </Container>
  );
};

export const LensMarkDownRenderer = React.memo(LensMarkDownRendererComponent);
