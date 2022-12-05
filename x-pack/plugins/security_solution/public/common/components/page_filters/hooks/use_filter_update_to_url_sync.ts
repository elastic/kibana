/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ControlGroupInput,
  ControlPanelState,
  OptionsListEmbeddableInput,
} from '@kbn/controls-plugin/common';
import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { URL_PARAM_KEY } from '../../../hooks/use_url_state';
import { updateUrlParam } from '../../../store/global_url_param/actions';
import { encodeRisonUrlState } from '../../../utils/global_query_string/helpers';
import type { FilterUrlFormat } from '../types';

export interface UseFilterUrlSyncParams {
  controlGroupInput: ControlGroupInput | undefined;
}

export const useFilterUpdatesToUrlSync = ({ controlGroupInput }: UseFilterUrlSyncParams) => {
  const dispatch = useDispatch();

  const formattedFilters: FilterUrlFormat | undefined = useMemo(() => {
    if (!controlGroupInput) return;
    const { panels } = controlGroupInput;
    const result: FilterUrlFormat = {};
    Object.keys(panels).forEach((panelId) => {
      const {
        explicitInput: { fieldName, selectedOptions, title },
      } = panels[panelId] as ControlPanelState<OptionsListEmbeddableInput>;
      result[panelId] = {
        fieldName: fieldName as string,
        selectedOptions: selectedOptions ?? [],
        title,
      };
    });

    if (Object.keys(result).length > 0) return result;
  }, [controlGroupInput]);

  useEffect(() => {
    if (!formattedFilters) return;
    dispatch(
      updateUrlParam({
        key: URL_PARAM_KEY.pageFilter,
        value: encodeRisonUrlState(Object.values(formattedFilters)),
      })
    );
  }, [formattedFilters, dispatch]);
};
