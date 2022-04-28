/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const SearchIndexOverview: React.FC = () => {
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[]}
      pageViewTelemetry="Overview"
      isLoading={false}
    >
      <>Overview</>
    </EnterpriseSearchContentPageTemplate>
  );
};
