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
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/selectors';

interface FlyoutPaneComponentProps {
  timelineId: TimelineId;
}

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({ timelineId }) => {
  const { euiTheme } = useEuiTheme();
  const isFullScreen = useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

  const background = useEuiBackgroundColor('plain');
  const modalStyles = useMemo(() => {
    if (isFullScreen) {
      return '';
    }
    return `
      margin: ${euiTheme.size.m};
      border-radius: ${euiTheme.border.radius.medium};
      padding: 0 ${euiTheme.size.s};
    `;
  }, [euiTheme, isFullScreen]);

  return (
    <EuiOverlayMask
      data-test-subj="flyout-pane"
      headerZindexLocation="above"
      css={`
        // .euiOverlayMask class concatenation to make styles take precedence over .euiOverlayMask-aboveHeader
        &.euiOverlayMask {
          top: var(--euiFixedHeadersOffset, 0);
          z-index: ${euiTheme.levels.flyout};
        }
      `}
    >
      <div
        aria-label={i18n.TIMELINE_DESCRIPTION}
        data-test-subj="timeline-flyout"
        css={css`
          min-width: 150px;
          height: inherit;
          position: fixed;
          top: var(--euiFixedHeadersOffset, 0);
          right: 0;
          bottom: 0;
          left: 0;
          background: ${background};
          ${modalStyles}
        `}
      >
        <StatefulTimeline
          renderCellValue={DefaultCellRenderer}
          rowRenderers={defaultRowRenderers}
          timelineId={timelineId}
        />
      </div>
    </EuiOverlayMask>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
