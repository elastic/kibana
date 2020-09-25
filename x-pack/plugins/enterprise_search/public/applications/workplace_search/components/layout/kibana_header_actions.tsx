/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';

import { IExternalUrl } from '../../../shared/enterprise_search_url';

interface IProps {
  externalUrl: IExternalUrl;
}

export const WorkplaceSearchHeaderActions: React.FC<IProps> = ({ externalUrl }) => {
  const { enterpriseSearchUrl, getWorkplaceSearchUrl } = externalUrl;
  if (!enterpriseSearchUrl) return null;

  return (
    <EuiButtonEmpty href={getWorkplaceSearchUrl('/search')} target="_blank" iconType="search">
      {i18n.translate('xpack.enterpriseSearch.workplaceSearch.headerActions.searchApplication', {
        defaultMessage: 'Go to search application',
      })}
    </EuiButtonEmpty>
  );
};
