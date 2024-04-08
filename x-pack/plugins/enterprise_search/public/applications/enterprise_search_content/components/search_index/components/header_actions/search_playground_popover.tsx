/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';

import { PLAYGROUND_PATH } from '../../../../routes';

export interface SearchPlaygroundPopoverProps {
  indexName: string;
  ingestionMethod: string;
}

export const SearchPlaygroundPopover: React.FC<SearchPlaygroundPopoverProps> = ({
  indexName,
  ingestionMethod,
}) => {
  const playgroundUrl = PLAYGROUND_PATH + `?defaultIndexName=${indexName}`;

  return (
    <EuiButton
      data-telemetry-id={`entSearchContent-${ingestionMethod}-header-viewPlayground`}
      iconType="eye"
      onClick={() => {
        KibanaLogic.values.navigateToUrl(playgroundUrl, {
          shouldNotCreateHref: false,
        });
      }}
    >
      {i18n.translate('xpack.enterpriseSearch.content.index.viewPlayground', {
        defaultMessage: 'View in Playground',
      })}
    </EuiButton>
  );
};
