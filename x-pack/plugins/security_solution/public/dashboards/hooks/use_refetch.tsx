/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';
import { inputsActions } from '../../common/store/inputs';
import { InputsModelId } from '../../common/store/inputs/constants';

export const useRefetch = ({
  inputId = InputsModelId.global,
  id,
  container,
}: {
  inputId: InputsModelId.global | InputsModelId.timeline;
  id: string;
  container?: DashboardContainer;
}) => {
  const dispatch = useDispatch();

  const refetchByForceRefresh = useCallback(() => {
    container?.forceRefresh();
  }, [container]);

  useEffect(() => {
    dispatch(
      inputsActions.setQuery({
        inputId,
        id,
        refetch: refetchByForceRefresh,
        loading: false,
        inspect: null,
      })
    );
    return () => {
      dispatch(inputsActions.deleteOneQuery({ inputId, id }));
    };
  }, [dispatch, id, inputId, refetchByForceRefresh]);
};
