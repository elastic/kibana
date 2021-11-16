/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutProps } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useDispatch } from 'react-redux';

import { StatefulTimeline } from '../../timeline';
import { TimelineId } from '../../../../../common/types/timeline';
import * as i18n from './translations';
import { timelineActions } from '../../../store/timeline';
import { defaultRowRenderers } from '../../timeline/body/renderers';
import { DefaultCellRenderer } from '../../timeline/cell_rendering/default_cell_renderer';
import { focusActiveTimelineButton } from '../../timeline/helpers';

interface FlyoutPaneComponentProps {
  timelineId: TimelineId;
  visible?: boolean;
}

const StyledEuiFlyout = styled(EuiFlyout)<EuiFlyoutProps>`
  animation: none;
  min-width: 150px;
  z-index: ${({ theme }) => theme.eui.euiZLevel4};
`;

// SIDE EFFECT: the following creates a global class selector
const IndexPatternFieldEditorOverlayGlobalStyle = createGlobalStyle<{
  theme: { eui: { euiZLevel5: number } };
}>`
  .indexPatternFieldEditorMaskOverlay {
    ${({ theme }) => `
    z-index: ${theme.eui.euiZLevel5};
  `}
  }
`;

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  timelineId,
  visible = true,
}) => {
  const dispatch = useDispatch();
  const handleClose = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    focusActiveTimelineButton();
  }, [dispatch, timelineId]);

  return (
    <div data-test-subj="flyout-pane" style={{ visibility: visible ? 'visible' : 'hidden' }}>
      <StyledEuiFlyout
        aria-label={i18n.TIMELINE_DESCRIPTION}
        className="timeline-flyout"
        data-test-subj="eui-flyout"
        hideCloseButton={true}
        onClose={handleClose}
        size="100%"
        ownFocus={false}
        style={{ visibility: visible ? 'visible' : 'hidden' }}
      >
        <IndexPatternFieldEditorOverlayGlobalStyle />
        <StatefulTimeline
          renderCellValue={DefaultCellRenderer}
          rowRenderers={defaultRowRenderers}
          timelineId={timelineId}
        />
      </StyledEuiFlyout>
    </div>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
