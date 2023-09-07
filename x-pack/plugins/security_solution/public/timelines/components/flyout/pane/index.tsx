/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { css } from '@emotion/react';
import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';

import { StatefulTimeline } from '../../timeline';
import type { TimelineId } from '../../../../../common/types/timeline';
import * as i18n from './translations';
import { defaultRowRenderers } from '../../timeline/body/renderers';
import { DefaultCellRenderer } from '../../timeline/cell_rendering/default_cell_renderer';
import { EuiPortal } from './custom_portal';
interface FlyoutPaneComponentProps {
  timelineId: TimelineId;
  visible?: boolean;
}

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  timelineId,
  visible = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const ref = useRef<HTMLDivElement>(null);
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
    <div data-test-subj="flyout-pane" ref={ref}>
      <EuiPortal insert={{ sibling: !visible ? ref?.current : null, position: 'after' }}>
        <div
          aria-label={i18n.TIMELINE_DESCRIPTION}
          className="euiFlyout"
          data-test-subj="timeline-flyout"
          css={css`
            min-width: 150px;
            height: 100%;
            top: 0;
            left: 0;
            background: ${useEuiBackgroundColor('plain')};
            position: fixed;
            width: 100%;
            z-index: ${euiTheme.levels.flyout};
            display: ${visible ? 'block' : 'none'};
          `}
        >
          {timeline}
        </div>
      </EuiPortal>
    </div>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
