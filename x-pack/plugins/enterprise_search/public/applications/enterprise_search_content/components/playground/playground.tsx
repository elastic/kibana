/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useSearchParams } from 'react-router-dom-v5-compat';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const Playground: React.FC = () => {
  const [searchParams] = useSearchParams();
  const index: string | null = searchParams.has('default-index')
    ? searchParams.get('default-index')
    : null;
  const { searchPlayground } = useValues(KibanaLogic);

  if (!searchPlayground) {
    return null;
  }
  return (
    <searchPlayground.PlaygroundProvider
      defaultValues={{
        indices: index ? [index] : [],
      }}
    >
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
