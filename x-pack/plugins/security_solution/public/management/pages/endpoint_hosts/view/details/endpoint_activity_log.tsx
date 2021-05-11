/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFieldSearch, EuiSpacer } from '@elastic/eui';
import { TimelineEntry } from './components/timeline_entry';
import { EndpointAction } from '../../../../../../common/endpoint/types';

export const EndpointActivityLog = ({ endpointActions }: { endpointActions: EndpointAction[] }) => (
  <>
    <EuiFieldSearch compressed fullWidth placeholder="Search activity log" />
    <EuiSpacer size="l" />
    {endpointActions.map((endpointAction) => (
      <TimelineEntry key={endpointAction['@timestamp']} endpointAction={endpointAction} />
    ))}
  </>
);

EndpointActivityLog.displayName = 'EndpointActivityLog';
