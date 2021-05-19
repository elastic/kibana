/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiFieldSearch, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { TimelineEntry } from './components/timeline_entry';
import * as i18 from '../translations';
import { Immutable, EndpointAction } from '../../../../../../common/endpoint/types';

export const EndpointActivityLog = memo(
  ({ endpointActions }: { endpointActions: Immutable<EndpointAction[]> }) => {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiFieldSearch compressed fullWidth placeholder={i18.SEARCH_ACTIVITY_LOG} />
        <EuiSpacer size="l" />
        {!endpointActions.length ? (
          <EuiEmptyPrompt
            iconType="alert"
            titleSize="s"
            title={<h2>{'No activity logged for the endpoint'}</h2>}
            body={<p>{'Perform some actions on the endpoint to see actions log here.'}</p>}
          />
        ) : (
          endpointActions.map((endpointAction) => (
            <TimelineEntry key={endpointAction.action_id} endpointAction={endpointAction} />
          ))
        )}
      </>
    );
  }
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
