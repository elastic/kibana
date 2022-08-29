/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const Settings: React.FC = () => {
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        i18n.translate('xpack.enterpriseSearch.content.searchIndices.content.breadcrumb', {
          defaultMessage: 'Content',
        }),
        i18n.translate('xpack.enterpriseSearch.content.settings.breadcrumb', {
          defaultMessage: 'Settings',
        }),
      ]}
      pageViewTelemetry="Settings"
      isLoading={false}
    >
      <>Settings</>
    </EnterpriseSearchContentPageTemplate>
  );
};
