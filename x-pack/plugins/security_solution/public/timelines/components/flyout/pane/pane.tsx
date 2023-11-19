/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import { StatefulTimeline } from '../../timeline';
import type { TimelineId } from '../../../../../common/types/timeline';
import * as i18n from './translations';
import { defaultRowRenderers } from '../../timeline/body/renderers';
import { DefaultCellRenderer } from '../../timeline/cell_rendering/default_cell_renderer';
import { EuiPortal } from './custom_portal';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store/selectors';
import { usePaneStyles, OverflowHiddenGlobalStyles } from './pane.styles';

interface FlyoutPaneComponentProps {
  timelineId: TimelineId;
  visible?: boolean;
}

const FlyoutPaneComponent: React.FC<FlyoutPaneComponentProps> = ({
  timelineId,
  visible = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isFullScreen = useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

  const styles = usePaneStyles();
  const wrapperClassName = classNames('timeline-wrapper', styles, {
    'timeline-wrapper--full-screen': isFullScreen,
    'timeline-wrapper--hidden': !visible,
  });

  return (
    <div data-test-subj="flyout-pane" ref={ref}>
      <EuiPortal insert={{ sibling: !visible ? ref?.current : null, position: 'after' }}>
        <div data-test-subj="timeline-wrapper" className={wrapperClassName}>
          <div
            aria-label={i18n.TIMELINE_DESCRIPTION}
            data-test-subj="timeline-flyout"
            className="timeline-flyout"
          >
            <StatefulTimeline
              renderCellValue={DefaultCellRenderer}
              rowRenderers={defaultRowRenderers}
              timelineId={timelineId}
            />
          </div>
        </div>
      </EuiPortal>
      {visible && <OverflowHiddenGlobalStyles />}
    </div>
  );
};

export const Pane = React.memo(FlyoutPaneComponent);

Pane.displayName = 'Pane';
