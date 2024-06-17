/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';

import { EndpointsHeaderAction } from '../../../shared/layout/endpoints_header_action';

export const PlaygroundHeaderDocsAction: React.FC = () => {
  const { searchPlayground } = useValues(KibanaLogic);

  if (!searchPlayground) {
    return null;
  }
  return (
    <EndpointsHeaderAction>
      <searchPlayground.PlaygroundHeaderDocs />
    </EndpointsHeaderAction>
  );
};
