/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { StatefulTimeline } from '../timeline';
import type { TimelineId } from '../../../../common/types/timeline';
import { defaultRowRenderers } from '../timeline/body/renderers';
import { DefaultCellRenderer } from '../timeline/cell_rendering/default_cell_renderer';
import { CustomEuiPortal } from './custom_portal';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../common/store/selectors';
import { usePaneStyles, OverflowHiddenGlobalStyles } from './index.styles';

const TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.timeline.modal.timelinePropertiesAriaLabel',
  {
    defaultMessage: 'Timeline Properties',
  }
);

interface TimelineModalProps {
  /**
   * Id of the timeline to be displayed within the modal
   */
  timelineId: TimelineId;
  /**
   * If true the timeline modal will be visible
   */
  visible?: boolean;
  openToggleRef: React.MutableRefObject<null | HTMLAnchorElement | HTMLButtonElement>;
}

/**
 * Renders the timeline modal. Internally this is using an EuiPortal.
 */
export const TimelineModal = React.memo<TimelineModalProps>(
  ({ timelineId, openToggleRef, visible = true }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isFullScreen =
      useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

    const styles = usePaneStyles();
    const wrapperClassName = classNames('timeline-portal-overlay-mask', styles, {
      'timeline-portal-overlay-mask--full-screen': isFullScreen,
      'timeline-portal-overlay-mask--hidden': !visible,
    });

    const sibling: HTMLDivElement | null = useMemo(
      () => (!visible ? ref?.current : null),
      [visible]
    );

    return (
      <div data-test-subj="timeline-portal-ref" ref={ref}>
        <CustomEuiPortal sibling={sibling}>
          <div data-test-subj="timeline-portal-overlay-mask" className={wrapperClassName}>
            <div
              aria-label={TIMELINE_DESCRIPTION}
              data-test-subj="timeline-container"
              className="timeline-container"
            >
              <StatefulTimeline
                renderCellValue={DefaultCellRenderer}
                rowRenderers={defaultRowRenderers}
                timelineId={timelineId}
                openToggleRef={openToggleRef}
              />
            </div>
          </div>
        </CustomEuiPortal>
        {visible && <OverflowHiddenGlobalStyles />}
      </div>
    );
  }
);

TimelineModal.displayName = 'TimelineModal';
