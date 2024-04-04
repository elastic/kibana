/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const Playground: React.FC = () => {
  const { searchPlayground } = useValues(KibanaLogic);

  return (
    <searchPlayground.PlaygroundProvider>
      <EnterpriseSearchContentPageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.content.playground.breadcrumb', {
            defaultMessage: 'Playground',
          }),
        ]}
        pageHeader={{
          pageTitle: i18n.translate('xpack.enterpriseSearch.content.playground.headerTitle', {
            defaultMessage: 'Playground',
          }),
          rightSideItems: [<searchPlayground.PlaygroundToolbar />],
        }}
        pageViewTelemetry="Playground"
        restrictWidth={false}
        customPageSections
        bottomBorder="extended"
      >
        <searchPlayground.Playground />
      </EnterpriseSearchContentPageTemplate>
    </searchPlayground.PlaygroundProvider>
  );
};
