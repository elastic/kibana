/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memo, useEffect } from 'react';
import { connect, ConnectedProps } from 'react-redux';
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

type OwnProps = TimelineKqlFetchProps & PropsFromRedux;

const TimelineKqlFetchComponent = memo<OwnProps>(
  ({ id, indexPattern, inputId, kueryFilterQuery, kueryFilterQueryDraft, setTimelineQuery }) => {
    useEffect(() => {
      setTimelineQuery({
        id: 'kql',
        inputId,
        inspect: null,
        loading: false,
        /* eslint-disable-next-line react-hooks/rules-of-hooks */
        refetch: useUpdateKql({
          indexPattern,
          kueryFilterQuery,
          kueryFilterQueryDraft,
          storeType: 'timelineType',
          timelineId: id,
        }),
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kueryFilterQueryDraft, kueryFilterQuery, id]);
    return null;
  },
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.inputId === nextProps.inputId &&
    prevProps.setTimelineQuery === nextProps.setTimelineQuery &&
    deepEqual(prevProps.kueryFilterQuery, nextProps.kueryFilterQuery) &&
    deepEqual(prevProps.kueryFilterQueryDraft, nextProps.kueryFilterQueryDraft) &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern)
);

const makeMapStateToProps = () => {
  const getTimelineKueryFilterQueryDraft = timelineSelectors.getKqlFilterQueryDraftSelector();
  const getTimelineKueryFilterQuery = timelineSelectors.getKqlFilterKuerySelector();
  const mapStateToProps = (state: State, { id }: TimelineKqlFetchProps) => {
    return {
      kueryFilterQuery: getTimelineKueryFilterQuery(state, id),
      kueryFilterQueryDraft: getTimelineKueryFilterQueryDraft(state, id),
    };
  };
  return mapStateToProps;
};

const mapDispatchToProps = {
  setTimelineQuery: inputsActions.setQuery,
};

export const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const TimelineKqlFetch = connector(TimelineKqlFetchComponent);
