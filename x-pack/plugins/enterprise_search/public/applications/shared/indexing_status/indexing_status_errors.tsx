/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import { EuiLinkTo } from '../react_router_helpers';

interface IIndexingStatusErrorsProps {
  viewLinkPath: string;
}

export const IndexingStatusErrors: React.FC<IIndexingStatusErrorsProps> = ({ viewLinkPath }) => (
  <EuiCallOut
    className="c-stui-indexing-status-errors"
    color="danger"
    iconType="cross"
    title="There was an error"
    data-test-subj="IndexingStatusErrors"
  >
    <p>Several documents have field conversion errors.</p>
    <EuiButton color="danger" fill={true} size="s" data-test-subj="ViewErrorsButton">
      <EuiLinkTo to={viewLinkPath}>View Errors</EuiLinkTo>
    </EuiButton>
  </EuiCallOut>
);
