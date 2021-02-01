/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiButton, EuiSpacer } from '@elastic/eui';

import { KibanaLogic } from '../../../../shared/kibana';
import { ENGINE_ANALYTICS_QUERY_DETAIL_PATH } from '../../../routes';
import { generateEnginePath } from '../../engine';

export const AnalyticsSearch: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');

  const { navigateToUrl } = useValues(KibanaLogic);
  const viewQueryDetails = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const query = searchValue || '""';
    navigateToUrl(generateEnginePath(ENGINE_ANALYTICS_QUERY_DETAIL_PATH, { query }));
  };

  return (
    <form onSubmit={viewQueryDetails}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetailSearchPlaceholder',
              { defaultMessage: 'Go to search term' }
            )}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton type="submit">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetailSearchButtonLabel',
              { defaultMessage: 'View details' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </form>
  );
};
