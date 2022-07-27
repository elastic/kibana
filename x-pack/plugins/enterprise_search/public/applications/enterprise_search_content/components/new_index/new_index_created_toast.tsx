/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_URL } from '../../../../../common/constants';

import { flashSuccessToast } from '../../../shared/flash_messages';
import { EuiButtonTo } from '../../../shared/react_router_helpers';

const SuccessToast = (
  <>
    <EuiText size="s">
      {i18n.translate('xpack.enterpriseSearch.content.new_index.successToast.description', {
        defaultMessage:
          'You can use App Search engines to build a search experience for your new Elasticsearch index.',
      })}
    </EuiText>
    <EuiSpacer size="s" />
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiButtonTo to={`${APP_SEARCH_URL}/engines`} shouldNotCreateHref color="success">
          {i18n.translate('xpack.enterpriseSearch.content.new_index.successToast.button.label', {
            defaultMessage: 'Create an engine',
          })}
        </EuiButtonTo>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

export function flashIndexCreatedToast(): void {
  flashSuccessToast(
    i18n.translate('xpack.enterpriseSearch.content.new_index.successToast.title', {
      defaultMessage: 'Index created successfully',
    }),
    {
      iconType: 'cheer',
      text: SuccessToast,
    }
  );
}
