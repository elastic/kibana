/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import { EuiButtonTo } from '../react_router_helpers';

import { INDEXING_STATUS_HAS_ERRORS_TITLE, INDEXING_STATUS_HAS_ERRORS_BUTTON } from './constants';

interface IIndexingStatusErrorsProps {
  viewLinkPath: string;
}

export const IndexingStatusErrors: React.FC<IIndexingStatusErrorsProps> = ({ viewLinkPath }) => (
  <EuiCallOut
    color="danger"
    iconType="cross"
    title="There was an error"
    data-test-subj="IndexingStatusErrors"
  >
    <p>{INDEXING_STATUS_HAS_ERRORS_TITLE}</p>

    <EuiButtonTo to={viewLinkPath} color="danger" fill size="s" data-test-subj="ViewErrorsButton">
      {INDEXING_STATUS_HAS_ERRORS_BUTTON}
    </EuiButtonTo>
  </EuiCallOut>
);
