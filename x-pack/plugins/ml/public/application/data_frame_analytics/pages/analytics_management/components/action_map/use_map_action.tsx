/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { useNavigateToPath } from '../../../../../contexts/kibana';

import {
  getJobMapUrl,
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';

import { mapActionButtonText, MapButton } from './map_button';

export type MapAction = ReturnType<typeof useMapAction>;
export const useMapAction = () => {
  const navigateToPath = useNavigateToPath();

  const clickHandler = useCallback((item: DataFrameAnalyticsListRow) => {
    navigateToPath(getJobMapUrl(item.id));
  }, []);

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      isPrimary: true,
      name: (item: DataFrameAnalyticsListRow) => <MapButton item={item} />,
      enabled: () => true,
      description: mapActionButtonText,
      icon: 'graphApp',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobMapButton',
    }),
    [clickHandler]
  );

  return { action };
};
