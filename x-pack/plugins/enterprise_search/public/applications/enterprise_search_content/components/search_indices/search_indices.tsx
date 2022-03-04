/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { SEARCH_INDEX_OVERVIEW_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const SearchIndices: React.FC = () => {
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[]}
      pageViewTelemetry="Search indices"
      isLoading={false}
    >
      <>Search indices</>
      <br />
      <br />
      <EuiLinkTo to={generatePath(SEARCH_INDEX_OVERVIEW_PATH, { indexSlug: 'foo123' })}>
        Sample Index
      </EuiLinkTo>
    </EnterpriseSearchContentPageTemplate>
  );
};
