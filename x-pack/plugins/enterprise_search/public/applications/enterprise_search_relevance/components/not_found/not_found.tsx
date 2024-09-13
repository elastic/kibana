/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { SEARCH_RELEVANCE_PLUGIN } from '../../../../../common/constants';
import { PageTemplateProps } from '../../../shared/layout';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import { EnterpriseSearchRelevancePageTemplate } from '../layout';

export const NotFound: React.FC<PageTemplateProps> = ({ pageChrome = [] }) => {
  return (
    <EnterpriseSearchRelevancePageTemplate pageChrome={[...pageChrome, '404']} customPageSections>
      <SendEnterpriseSearchTelemetry action="error" metric="not_found" />
      <NotFoundPrompt productSupportUrl={SEARCH_RELEVANCE_PLUGIN.SUPPORT_URL} />
    </EnterpriseSearchRelevancePageTemplate>
  );
};
