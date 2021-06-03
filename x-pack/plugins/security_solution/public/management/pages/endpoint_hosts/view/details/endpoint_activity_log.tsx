/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { LogEntry } from './components/log_entry';
import * as i18 from '../translations';
import { SearchBar } from '../../../../components/search_bar';
import { Immutable, ActivityLog } from '../../../../../../common/endpoint/types';
import { AsyncResourceState } from '../../../../state';

export const EndpointActivityLog = memo(
  ({ activityLog }: { activityLog: AsyncResourceState<Immutable<ActivityLog>> }) => {
    // TODO
    const onSearch = useCallback(() => {}, []);
    return (
      <>
        <EuiSpacer size="l" />
        {activityLog.type !== 'LoadedResourceState' || !activityLog.data.length ? (
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
            {
              // @ts-ignore
              activityLog.data.map((logEntry) => (
                <LogEntry key={logEntry.item.action_id} logEntry={logEntry} />
              ))
            }
          </>
        )}
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
