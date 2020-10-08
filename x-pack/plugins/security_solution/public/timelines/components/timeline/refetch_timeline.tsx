/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { inputsModel } from '../../../common/store';
import { inputsActions } from '../../../common/store/actions';
import { InputsModelId } from '../../../common/store/inputs/constants';

export interface TimelineRefetchProps {
  id: string;
  inputId: InputsModelId;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}

const TimelineRefetchComponent: React.FC<TimelineRefetchProps> = ({
  id,
  inputId,
  inspect,
  loading,
  refetch,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(inputsActions.setQuery({ id, inputId, inspect, loading, refetch }));
  }, [dispatch, id, inputId, loading, refetch, inspect]);

  return null;
};

export const TimelineRefetch = React.memo(TimelineRefetchComponent);
