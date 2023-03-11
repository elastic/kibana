/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { TimeBuckets, UI_SETTINGS } from '@kbn/data-plugin/common';
import { useKibana } from '../utils/kibana_react';

export const useTimeBuckets = () => {
  const { uiSettings } = useKibana().services;

  return useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);
};
