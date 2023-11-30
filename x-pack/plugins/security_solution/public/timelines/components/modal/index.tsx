/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { StatefulTimeline } from '../timeline';
import type { TimelineId } from '../../../../common/types/timeline';
import { defaultRowRenderers } from '../timeline/body/renderers';
import { DefaultCellRenderer } from '../timeline/cell_rendering/default_cell_renderer';
import { EuiPortal } from './custom_portal';
import { useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../common/store/selectors';
import { usePaneStyles, OverflowHiddenGlobalStyles } from './index.styles';

interface TimelineModalProps {
  /**
   * Id of the timeline used within the portal
   */
  timelineId: TimelineId;
  /**
   * If true, the portal will be visible
   */
  visible?: boolean;
}

/**
 * This component renders the EUI portal component that renders timeline.
 */
export const TimelineModal: React.FC<TimelineModalProps> = React.memo(
  ({ timelineId, visible = true }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isFullScreen =
      useShallowEqualSelector(inputsSelectors.timelineFullScreenSelector) ?? false;

    const styles = usePaneStyles();
    const wrapperClassName = classNames('timeline-modal-overlay-mask', styles, {
      'timeline-modal--full-screen': isFullScreen,
    });

    return (
      <div data-test-subj="timeline-modal-wrapper-ref" ref={ref}>
        <EuiPortal insert={{ sibling: !visible ? ref?.current : null, position: 'after' }}>
          <div
            data-test-subj="timeline-modal-overlay-mask"
            className={wrapperClassName}
            css={css`
              ${!visible && `display: none;`}
            `}
          >
            <div
              aria-label={i18n.translate(
                'xpack.securitySolution.timeline.flyout.modal.timelinePropertiesAriaLabel',
                {
                  defaultMessage: 'Timeline Properties',
                }
              )}
              data-test-subj="timeline-modal-content"
              className="timeline-modal-content"
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
  }
);

TimelineModal.displayName = 'TimelinePortal';
