/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
} from '@elastic/eui';

import { SetElasticsearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchSearchExperiencesPageTemplate } from '../layout';

export const SearchExperiencesGuide: React.FC = () => {
  return (
    <EnterpriseSearchSearchExperiencesPageTemplate>
      <SetPageChrome />
      <EuiFlexGroup alignItems="flexStart" data-test-subj="elasticsearchGuide">
        <h1>Search experiences</h1>
      </EuiFlexGroup>
    </EnterpriseSearchSearchExperiencesPageTemplate>
  );
};
