/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlGroupInput } from '@kbn/controls-plugin/common';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { formatPageFilterSearchParam } from '../../../../../common/utils/format_page_filter_search_param';
import { URL_PARAM_KEY } from '../../../hooks/use_url_state';
import { updateUrlParam } from '../../../store/global_url_param/actions';
import type { FilterItemObj } from '../types';
import { getFilterItemObjListFromControlInput } from '../utils';

export interface UseFilterUrlSyncParams {
  controlGroupInput: ControlGroupInput | undefined;
}

export const useFilterUpdatesToUrlSync = ({ controlGroupInput }: UseFilterUrlSyncParams) => {
  const dispatch = useDispatch();

  const formattedFilters: FilterItemObj[] | undefined = useMemo(() => {
    if (!controlGroupInput) return;
    return getFilterItemObjListFromControlInput(controlGroupInput);
  }, [controlGroupInput]);

  useEffect(() => {
    if (!formattedFilters) return;
    if (controlGroupInput?.viewMode !== ViewMode.VIEW) return;
    dispatch(
      updateUrlParam({
        key: URL_PARAM_KEY.pageFilter,
        value: formatPageFilterSearchParam(formattedFilters),
      })
    );
  }, [formattedFilters, dispatch, controlGroupInput]);
};
