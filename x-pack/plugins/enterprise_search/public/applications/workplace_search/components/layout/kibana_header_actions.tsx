/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';

import { externalUrl, getWorkplaceSearchUrl } from '../../../shared/enterprise_search_url';

export const WorkplaceSearchHeaderActions: React.FC = () => {
  if (!externalUrl.enterpriseSearchUrl) return null;

  return (
    <EuiButtonEmpty
      href={getWorkplaceSearchUrl('/search')}
      target="_blank"
      iconType="search"
      style={{ marginRight: 5 }}
    >
      <EuiText size="s">
        {i18n.translate('xpack.enterpriseSearch.workplaceSearch.headerActions.searchApplication', {
          defaultMessage: 'Go to search application',
        })}
      </EuiText>
    </EuiButtonEmpty>
  );
};
