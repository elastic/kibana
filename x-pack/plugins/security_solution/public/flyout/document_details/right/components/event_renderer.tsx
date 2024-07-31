/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlexItem, EuiTitle } from '@elastic/eui';
import styled from '@emotion/styled';
import { euiThemeVars } from '@kbn/ui-theme';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { useDocumentDetailsContext } from '../../shared/context';
import { EVENT_RENDERER_TEST_ID } from './test_ids';

const ReasonPreviewContainerWrapper = styled.div`
  overflow-x: auto;
  padding-block: ${euiThemeVars.euiSizeS};
`;

const ReasonPreviewContainer = styled.div``;

/**
 * Event renderer of an event document
 */
export const EventRenderer: FC = () => {
  const { dataAsNestedObject, scopeId } = useDocumentDetailsContext();

  const renderer = useMemo(
    () => getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers }),
    [dataAsNestedObject]
  );
  const rowRenderer = useMemo(
    () =>
      renderer
        ? renderer.renderRow({
            contextId: 'event-details',
            data: dataAsNestedObject,
            isDraggable: false,
            scopeId,
          })
        : null,
    [renderer, dataAsNestedObject, scopeId]
  );

  if (!renderer) {
    return null;
  }
  return (
    <EuiFlexItem data-test-subj={EVENT_RENDERER_TEST_ID}>
      <EuiTitle size="xxs">
        <h5>{'Event renderer'}</h5>
      </EuiTitle>
      <ReasonPreviewContainerWrapper>
        <ReasonPreviewContainer className={'eui-displayInlineBlock'}>
          {rowRenderer}
        </ReasonPreviewContainer>
      </ReasonPreviewContainerWrapper>
    </EuiFlexItem>
  );
};

EventRenderer.displayName = 'EventRenderer';
