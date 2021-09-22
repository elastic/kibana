/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { AppSearchPageTemplate } from '../../../layout';
import { getCurationsBreadcrumbs } from '../../utils';

export const CurationSuggestion: React.FC = () => {
  const query = 'expert cooking advice';

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.breadcrumbLabel',
          { defaultMessage: 'Suggested: {query}', values: { query } }
        ),
      ])}
      pageHeader={{
        pageTitle: query,
      }}
    />
  );
};
