/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { map } from 'lodash';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibana } from '../common/lib/kibana';

const TimelineComponent = React.memo((props) => <EuiButtonEmpty {...props} size="xs" />);
TimelineComponent.displayName = 'TimelineComponent';

export const useAddToTimeline = () => {
  const {
    services: { timelines },
  } = useKibana();

  const { getAddToTimelineButton } = timelines.getHoverActions();

  const handleAddToTimeline = useCallback(
    (payload: { queries: Array<{ field: string; value: string }>; isIcon?: true }) => {
      const { queries, isIcon } = payload;

      const providers = map(queries, ({ field, value }) => ({
        and: [],
        enabled: true,
        excluded: false,
        id: value,
        kqlQuery: '',
        name: value,
        queryMatch: {
          field,
          value,
          operator: ':' as const,
        },
      }));

      return getAddToTimelineButton({
        dataProvider: providers,
        field: 'action_id',
        ownFocus: false,
        ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
      });
    },
    [getAddToTimelineButton]
  );

  return handleAddToTimeline;
};
