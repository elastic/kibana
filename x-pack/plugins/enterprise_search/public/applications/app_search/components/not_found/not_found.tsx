/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { APP_SEARCH_PLUGIN } from '../../../../../common/constants';
import { PageTemplateProps } from '../../../shared/layout';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendAppSearchTelemetry } from '../../../shared/telemetry';
import { AppSearchPageTemplate } from '../layout';

export const NotFound: React.FC<PageTemplateProps> = ({ pageChrome = [] }) => {
  return (
    <AppSearchPageTemplate pageChrome={[...pageChrome, '404']} customPageSections>
      <SendAppSearchTelemetry action="error" metric="not_found" />
      <NotFoundPrompt productSupportUrl={APP_SEARCH_PLUGIN.SUPPORT_URL} />
    </AppSearchPageTemplate>
  );
};
