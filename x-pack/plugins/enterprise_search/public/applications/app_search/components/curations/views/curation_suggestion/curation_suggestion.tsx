/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { useDecodedParams } from '../../../../utils/encode_path_params';
import { AppSearchPageTemplate } from '../../../layout';
import { getCurationsBreadcrumbs } from '../../utils';

export const CurationSuggestion: React.FC = () => {
  const { query } = useDecodedParams();

  const queryTitle = query === '""' ? query : `"${query}"`;

  return (
    <AppSearchPageTemplate
      pageChrome={getCurationsBreadcrumbs([
        i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.suggestedCuration.breadcrumbLabel',
          { defaultMessage: 'Suggested: {query}', values: { query } }
        ),
      ])}
      pageHeader={{
        pageTitle: queryTitle,
      }}
    />
  );
};
