/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { useKibana } from '../../lib/kibana';

const TimelineComponent = React.memo((props) => {
  return <EuiButtonEmpty {...props} size="xs" />;
});
TimelineComponent.displayName = 'TimelineComponent';

export const useHandleAddToTimeline = () => {
  const {
    services: { timelines },
  } = useKibana();
  const { getAddToTimelineButton } = timelines.getHoverActions();

  return useCallback(
    (payload: { query: [string, string]; isIcon?: true }) => {
      const {
        query: [field, value],
        isIcon,
      } = payload;
      const providerA: DataProvider = {
        and: [],
        enabled: true,
        excluded: false,
        id: value,
        kqlQuery: '',
        name: value,
        queryMatch: {
          field,
          value,
          operator: ':',
        },
      };

      return getAddToTimelineButton({
        dataProvider: providerA,
        field: value,
        ownFocus: false,
        ...(isIcon ? { showTooltip: true } : { Component: TimelineComponent }),
      });
    },
    [getAddToTimelineButton]
  );
};
