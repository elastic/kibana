/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectAlertFlyoutVisibility } from '../../../state';
import { enableDefaultAlertingAPI } from '../../../state/alert_rules/api';

export const useSyntheticsAlert = () => {
  const alertFlyoutVisible = useSelector(selectAlertFlyoutVisibility);

  const { data, loading } = useFetcher(() => {
    if (alertFlyoutVisible) {
      return enableDefaultAlertingAPI();
    }
    return Promise.resolve(null);
  }, [alertFlyoutVisible]);

  return useMemo(() => ({ alert: data, loading }), [data, loading]);
};
