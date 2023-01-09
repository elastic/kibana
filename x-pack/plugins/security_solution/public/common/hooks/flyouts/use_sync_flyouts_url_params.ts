/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useSelector } from 'react-redux';
import { useUpdateUrlParam } from '../../utils/global_query_string';
import { URL_PARAM_KEY } from '../use_url_state';
import { flyoutsSelector } from '../../store/flyout/selectors';
import type { SecurityFlyoutReducerByScope } from '../../store/flyout/model';
import { areUrlParamsValidSecurityFlyoutParams } from '../../store/flyout/helpers';

export const useSyncFlyoutsUrlParam = () => {
  const updateUrlParam = useUpdateUrlParam<SecurityFlyoutReducerByScope>(URL_PARAM_KEY.flyouts);
  const flyouts = useSelector(flyoutsSelector);

  useEffect(() => {
    if (areUrlParamsValidSecurityFlyoutParams(flyouts)) {
      // TODO: It may be better to allow for graceful failure of either flyout rather than making them interdependent
      // When they shouldn't be in any way
      updateUrlParam(flyouts);
    } else {
      updateUrlParam(null);
    }
  }, [flyouts, updateUrlParam]);
};
