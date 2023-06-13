/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { SetSearchExperiencesChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EnterpriseSearchEsrePageTemplate } from '../layout/page_template';

export const EsreGuide: React.FC = () => {
  return (
    <EnterpriseSearchEsrePageTemplate
      restrictWidth
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.esre.guide.pageTitle', {
          defaultMessage: 'Enhance your search with ESRE',
        }),
      }}
    >
      <SetPageChrome />
      <p>ESRE placeholder</p>
    </EnterpriseSearchEsrePageTemplate>
  );
};
