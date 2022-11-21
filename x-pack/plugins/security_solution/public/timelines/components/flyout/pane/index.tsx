/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlyout } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { useDispatch } from 'react-redux';

import {
  SELECTOR_TIMELINE_IS_VISIBLE_CSS_CLASS_NAME,
  TIMELINE_EUI_THEME_ZINDEX_LEVEL,
} from '../../timeline/styles';
import { StatefulTimeline } from '../../timeline';
import type { TimelineId } from '../../../../../common/types/timeline';
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
  z-index: ${({ theme }) => theme.eui[TIMELINE_EUI_THEME_ZINDEX_LEVEL]};
`;

// SIDE EFFECT: the following creates a global class selector
const IndexPatternFieldEditorOverlayGlobalStyle = createGlobalStyle<{
  theme: { eui: { euiZLevel5: number } };
}>`
  .euiOverlayMask.indexPatternFieldEditorMaskOverlay {
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

  useEffect(() => {
    if (visible) {
      document.body.classList.add(SELECTOR_TIMELINE_IS_VISIBLE_CSS_CLASS_NAME);
    } else {
      document.body.classList.remove(SELECTOR_TIMELINE_IS_VISIBLE_CSS_CLASS_NAME);
    }
  }, [visible]);

  return (
    <div data-test-subj="flyout-pane" style={{ display: visible ? 'block' : 'none' }}>
      <StyledEuiFlyout
        aria-label={i18n.TIMELINE_DESCRIPTION}
        className="timeline-flyout"
        data-test-subj="eui-flyout"
        hideCloseButton={true}
        onClose={handleClose}
        size="100%"
        ownFocus={false}
        style={{ display: visible ? 'block' : 'none' }}
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
