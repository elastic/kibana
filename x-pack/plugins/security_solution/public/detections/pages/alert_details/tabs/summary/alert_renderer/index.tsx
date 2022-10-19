/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { defaultRowRenderers } from '../../../../../../timelines/components/timeline/body/renderers';
import { getRowRenderer } from '../../../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { TimelineId } from '../../../../../../../common/types';
import type { Ecs } from '../../../../../../../common/ecs';

export interface AlertRendererProps {
  dataAsNestedObject: Ecs | null;
}

const RendererContainer = styled.div`
  overflow-x: auto;

  & .euiFlexGroup {
    justify-content: flex-start;
  }
`;

export const AlertRenderer = React.memo(({ dataAsNestedObject }: AlertRendererProps) => {
  const renderer = useMemo(
    () =>
      dataAsNestedObject != null
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  return (
    <>
      {renderer != null && dataAsNestedObject != null && (
        <div>
          <RendererContainer data-test-subj="alert-renderer-panel">
            {renderer.renderRow({
              data: dataAsNestedObject,
              isDraggable: false,
              scopeId: TimelineId.detectionsAlertDetailsPage,
            })}
          </RendererContainer>
        </div>
      )}
    </>
  );
});

AlertRenderer.displayName = 'AlertRenderer';
