/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiTextColor } from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';

export const RouteNotFound = ({
  msg = 'The page you are attempting to view does not exists',
  title = 'Route not found (404)',
  match,
}: RouteComponentProps & { msg?: string; title?: string }) => (
  <EuiCallOut title={title} color="warning" iconType="help">
    <p>{msg}</p>
    {match && match.url && (
      <p>
        <EuiTextColor color="subdued">Route: {match.url}</EuiTextColor>
      </p>
    )}
  </EuiCallOut>
);
