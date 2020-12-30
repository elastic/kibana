/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, memo } from 'react';
import { EuiToolTip, EuiLink, EuiMarkdownAstNodePosition } from '@elastic/eui';

import { useTimelineClick } from '../../../../utils/timeline/use_timeline_click';
import { TimelineProps } from './types';
import * as i18n from './translations';

export const TimelineMarkDownRendererComponent: React.FC<
  TimelineProps & {
    position: EuiMarkdownAstNodePosition;
  }
> = ({ id, title, graphEventId }) => {
  const handleTimelineClick = useTimelineClick();
  const onClickTimeline = useCallback(() => handleTimelineClick(id ?? '', graphEventId), [
    id,
    graphEventId,
    handleTimelineClick,
  ]);
  return (
    <EuiToolTip content={i18n.TIMELINE_ID(id ?? '')}>
      <EuiLink onClick={onClickTimeline} data-test-subj={`markdown-timeline-link-${id}`}>
        {title}
      </EuiLink>
    </EuiToolTip>
  );
};

export const TimelineMarkDownRenderer = memo(TimelineMarkDownRendererComponent);
