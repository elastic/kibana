/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { ViewCodeAction } from './view_code/view_code_action';
import { ViewQueryAction } from './view_query/view_query_action';

export const Toolbar: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="s">
      <ViewQueryAction />
      <ViewCodeAction />
    </EuiFlexGroup>
  );
};
