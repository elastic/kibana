/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiPageHeader, EuiPageHeaderSection, EuiPageContentBody, EuiTitle } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { FlashMessages } from '../../../shared/flash_messages';

export const Settings: React.FC = () => {
  return (
    <>
      <SetPageChrome
        trail={[
          i18n.translate('xpack.enterpriseSearch.appSearch.settings.title', {
            defaultMessage: 'Settings',
          }),
        ]}
      />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.enterpriseSearch.appSearch.settings.title', {
                defaultMessage: 'Settings',
              })}
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContentBody>
        <FlashMessages />
      </EuiPageContentBody>
    </>
  );
};
