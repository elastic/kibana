/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { defaultRowRenderers } from '../../../../../../timelines/components/timeline/body/renderers';
import { getRowRenderer } from '../../../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { TimelineId } from '../../../../../../../common/types';
import { SummaryPanel } from '../wrappers';
import { ALERT_REASON_PANEL_TITLE } from '../translation';

export interface AlertRendererPanelProps {
  dataAsNestedObject: Ecs | null;
}

const RendererContainer = styled.div`
  overflow-x: auto;
  margin-left: -24px;

  & .euiFlexGroup {
    justify-content: flex-start;
  }
`;

export const AlertRendererPanel = React.memo(({ dataAsNestedObject }: AlertRendererPanelProps) => {
  const renderer = useMemo(
    () =>
      dataAsNestedObject != null
        ? getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers })
        : null,
    [dataAsNestedObject]
  );

  return (
    <SummaryPanel title={ALERT_REASON_PANEL_TITLE}>
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
    </SummaryPanel>
  );
});

AlertRendererPanel.displayName = 'AlertRendererPanel';
