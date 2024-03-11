/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useEventDetailsWidthContext } from '../../../../common/components/events_viewer/event_details_width_context';

import { useKibana } from '../../../../common/lib/kibana';

interface FixedWidthLastUpdatedContainerProps {
  updatedAt: number;
}

export const isCompactFooter = (width: number): boolean => width < 600;

export const FixedWidthLastUpdatedContainer = React.memo<FixedWidthLastUpdatedContainerProps>(
  ({ updatedAt }) => {
    const { timelines } = useKibana().services;
    const width = useEventDetailsWidthContext();
    const compact = useMemo(() => isCompactFooter(width), [width]);

    return updatedAt > 0 ? (
      <FixedWidthLastUpdated data-test-subj="fixed-width-last-updated" compact={compact}>
        {timelines.getLastUpdated({ updatedAt, compact })}
      </FixedWidthLastUpdated>
    ) : null;
  }
);

FixedWidthLastUpdatedContainer.displayName = 'FixedWidthLastUpdatedContainer';

const FixedWidthLastUpdated = styled.span<{ compact?: boolean }>`
  width: ${({ compact }) => (!compact ? 200 : 25)}px;
  text-overflow: ellipsis;
  text-align: end;
  overflow: hidden;
`;

FixedWidthLastUpdated.displayName = 'FixedWidthLastUpdated';
