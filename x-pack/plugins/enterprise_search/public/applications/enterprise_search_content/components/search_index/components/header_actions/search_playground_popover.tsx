/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APPLICATIONS_PLUGIN } from '../../../../../../../common/constants';
import { PLAYGROUND_PATH } from '../../../../../applications/routes';
import { KibanaLogic } from '../../../../../shared/kibana';

export interface SearchPlaygroundPopoverProps {
  indexName: string;
  ingestionMethod: string;
}

export const SearchPlaygroundPopover: React.FC<SearchPlaygroundPopoverProps> = ({
  indexName,
  ingestionMethod,
}) => {
  const playgroundUrl = `${APPLICATIONS_PLUGIN.URL}${PLAYGROUND_PATH}?default-index=${indexName}`;

  return (
    <EuiButton
      data-test-subj="enterpriseSearchSearchPlaygroundPopoverViewInPlaygroundButton"
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
