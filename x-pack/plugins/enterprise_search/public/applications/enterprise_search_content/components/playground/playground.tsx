/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

export const Playground: React.FC = () => {
  return (
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
        rightSideItems: [],
      }}
      pageViewTelemetry="Playground"
      restrictWidth={false}
      customPageSections
      bottomBorder="extended"
    >
      <EuiPageTemplate.Section
        alignment="top"
        restrictWidth={false}
        grow
        contentProps={{ css: { display: 'flex', flexGrow: 1 } }}
        paddingSize="none"
      />
    </EnterpriseSearchContentPageTemplate>
  );
};
