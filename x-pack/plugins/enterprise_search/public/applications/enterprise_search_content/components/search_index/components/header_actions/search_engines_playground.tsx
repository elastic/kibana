/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../../../common/constants';
import { KibanaLogic } from '../../../../../shared/kibana';

import { PLAYGROUND_PATH } from '../../../../routes';

export interface SearchEnginesPlaygroundProps {
  indexName?: string;
  ingestionMethod: string;
}

export const SearchEnginesPlayground: React.FC<SearchEnginesPlaygroundProps> = ({
  indexName,
  ingestionMethod,
}) => {
  let playgroundUrl = ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + PLAYGROUND_PATH;
  if (indexName) {
    playgroundUrl = `${playgroundUrl}/${indexName}`;
  }

  return (
    <EuiButton
      data-telemetry-id={`entSearchContent-${ingestionMethod}-header-viewPlayground`}
      iconType="eye"
      onClick={() => {
        KibanaLogic.values.navigateToUrl(playgroundUrl, {
          shouldNotCreateHref: true,
        });
      }}
    >
      {i18n.translate('xpack.enterpriseSearch.content.index.viewPlayground', {
        defaultMessage: 'View in Playground',
      })}
    </EuiButton>
  );
};
