/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { PageTemplateProps } from '../../../shared/layout';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';
import { EnterpriseSearchContentPageTemplate } from '../layout';

export const NotFound: React.FC<PageTemplateProps> = ({ pageChrome = [] }) => {
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...pageChrome, '404']}
      template="centeredContent"
    >
      <SendEnterpriseSearchTelemetry action="error" metric="not_found" />
      <NotFoundPrompt productSupportUrl={ENTERPRISE_SEARCH_CONTENT_PLUGIN.SUPPORT_URL} />
    </EnterpriseSearchContentPageTemplate>
  );
};
