/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { ERROR_STATE_PATH } from '../../../routes';

export const CannotConnect: React.FC = () => {
  return (
    <EuiCallOut
      iconType="warning"
      color="warning"
      title={i18n.translate('xpack.enterpriseSearch.content.cannotConnect.title', {
        defaultMessage: 'Cannot connect to Enterprise Search',
      })}
    >
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.enterpriseSearch.content.searchIndex.cannotConnect.body"
          defaultMessage="The Elastic web crawler requires Enterprise Search. {link}"
          values={{
            link: (
              <EuiLinkTo to={ERROR_STATE_PATH}>
                {i18n.translate('xpack.enterpriseSearch.content.cannotConnect.body', {
                  defaultMessage: 'More information.',
                })}
              </EuiLinkTo>
            ),
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
};
