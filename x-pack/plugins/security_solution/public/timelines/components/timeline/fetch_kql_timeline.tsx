/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { IIndexPattern } from 'src/plugins/data/public';

import { State } from '../../../common/store';
import { inputsActions } from '../../../common/store/actions';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useUpdateKql } from '../../../common/utils/kql/use_update_kql';
import { timelineSelectors } from '../../store/timeline';
export interface TimelineKqlFetchProps {
  id: string;
  indexPattern: IIndexPattern;
  inputId: InputsModelId;
}

const TimelineKqlFetchComponent: React.FC<TimelineKqlFetchProps> = ({
  id,
  indexPattern,
  inputId,
}) => {
  const dispatch = useDispatch();
  const getTimelineKueryFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getTimelineKueryFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const kueryFilterQuery = useSelector(
    (state: State) => getTimelineKueryFilterQuery(state, id),
    shallowEqual
  );
  const kueryFilterQueryDraft = useSelector(
    (state: State) => getTimelineKueryFilterQueryDraft(state, id),
    shallowEqual
  );

  const setTimelineQuery = useCallback((payload) => dispatch(inputsActions.setQuery(payload)), [
    dispatch,
  ]);

  const refetch = useUpdateKql({
    indexPattern,
    kueryFilterQuery,
    kueryFilterQueryDraft,
    storeType: 'timelineType',
    timelineId: id,
  });

  useEffect(() => {
    setTimelineQuery({
      id: 'kql',
      inputId,
      inspect: null,
      loading: false,
      refetch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kueryFilterQueryDraft, kueryFilterQuery, id]);

  return null;
};

export const TimelineKqlFetch = React.memo(
  TimelineKqlFetchComponent,
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.inputId === nextProps.inputId &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern)
);
