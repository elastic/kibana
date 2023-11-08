/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiOverlayMask, useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';

import { StatefulTimeline } from '../../timeline';
import type { TimelineId } from '../../../../../common/types/timeline';
import * as i18n from './translations';
import { defaultRowRenderers } from '../../timeline/body/renderers';
import { DefaultCellRenderer } from '../../timeline/cell_rendering/default_cell_renderer';

interface FlyoutPaneComponentProps {
  timelineId: TimelineId;
  visible?: boolean;
}

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  timelineId,
  visible = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const timeline = useMemo(
    () => (
      <StatefulTimeline
        renderCellValue={DefaultCellRenderer}
        rowRenderers={defaultRowRenderers}
        timelineId={timelineId}
      />
    ),
    [timelineId]
  );

  return (
    <EuiOverlayMask
      data-test-subj="flyout-pane"
      headerZindexLocation="above"
      css={css`
        // .euiOverlayMask concatenated to make styles take precedence over .euiOverlayMask-aboveHeader
        &.euiOverlayMask {
          margin-top: var(--euiFixedHeadersOffset, 0);
          z-index: ${euiTheme.levels.flyout};
          ${visible ? '' : 'display: none;'}
        }
      `}
    >
      <div
        aria-label={i18n.TIMELINE_DESCRIPTION}
        data-test-subj="timeline-flyout"
        css={css`
          min-width: 150px;
          height: inherit;
          border-radius: ${euiTheme.border.radius.medium};
          top: var(--euiFixedHeadersOffset, 0);
          right: 0;
          bottom: 0;
          left: 0;
          margin: ${euiTheme.size.m};
          padding: 0 ${euiTheme.size.s};
          background: ${useEuiBackgroundColor('plain')};
          position: fixed;
        `}
      >
        {timeline}
      </div>
    </EuiOverlayMask>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
