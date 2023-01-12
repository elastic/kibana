/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useUpdateUrlParam } from '../../utils/global_query_string';
import { TableId } from '../../../../common/types';
import { useShallowEqualSelector } from '../use_selector';
import { URL_PARAM_KEY } from '../use_url_state';
import { dataTableSelectors } from '../../store/data_table';
import { tableDefaults } from '../../store/data_table/defaults';
import type { FlyoutUrlState } from './types';

export const useSyncFlyoutUrlParam = () => {
  const updateUrlParam = useUpdateUrlParam<FlyoutUrlState>(URL_PARAM_KEY.flyout);
  const getDataTable = dataTableSelectors.getTableByIdSelector();

  // Only allow the alerts page for now to be saved in the url state
  const { expandedDetail } = useShallowEqualSelector(
    (state) => getDataTable(state, TableId.alertsOnAlertsPage) ?? tableDefaults
  );

  useEffect(() => {
    updateUrlParam(expandedDetail != null && !!expandedDetail?.query ? expandedDetail.query : null);
  }, [expandedDetail, updateUrlParam]);
};
