/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import { EuiButton, EuiEmptyPrompt, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { LogEntry } from './components/log_entry';
import * as i18 from '../translations';
import { SearchBar } from '../../../../components/search_bar';
import { Immutable, ActivityLog } from '../../../../../../common/endpoint/types';
import { AsyncResourceState } from '../../../../state';
import { useEndpointSelector } from '../hooks';
import { EndpointAction } from '../../store/action';
import {
  getActivityLogDataPaging,
  getActivityLogError,
  getActivityLogRequestLoading,
} from '../../store/selectors';

export const EndpointActivityLog = memo(
  ({ activityLog }: { activityLog: AsyncResourceState<Immutable<ActivityLog>> }) => {
    const activityLoading = useEndpointSelector(getActivityLogRequestLoading);
    const activityError = useEndpointSelector(getActivityLogError);
    const dispatch = useDispatch<(a: EndpointAction) => void>();
    const { page, pageSize } = useEndpointSelector(getActivityLogDataPaging);

    // TODO
    const onSearch = useCallback(() => {}, []);

    const getActivityLog = useCallback(() => {
      dispatch({
        type: 'appRequestedEndpointActivityLog',
        payload: {
          page: page + 1,
          pageSize,
        },
      });
    }, [dispatch, page, pageSize]);

    return (
      <>
        <EuiSpacer size="l" />
        {(activityLog.type === 'LoadedResourceState' && !activityLog.data.items.length) ||
        activityError ? (
          <EuiEmptyPrompt
            iconType="editorUnorderedList"
            titleSize="s"
            title={<h2>{'No logged actions'}</h2>}
            body={<p>{'No actions have been logged for this endpoint.'}</p>}
          />
        ) : (
          <>
            <SearchBar onSearch={onSearch} placeholder={i18.SEARCH_ACTIVITY_LOG} />
            <EuiSpacer size="l" />
            {activityLoading ? (
              <EuiLoadingContent lines={3} />
            ) : (
              activityLog.type === 'LoadedResourceState' &&
              activityLog.data.items.map((logEntry) => (
                <LogEntry key={`${logEntry.item.id}`} logEntry={logEntry} />
              ))
            )}
            <EuiButton size="s" fill onClick={getActivityLog}>
              {'show more'}
            </EuiButton>
          </>
        )}
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
