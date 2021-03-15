/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageHeader, EuiPageContentBody, EuiPageContent } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { RESULT_SETTINGS_TITLE } from './constants';

interface Props {
  engineBreadcrumb: string[];
}

export const ResultSettings: React.FC<Props> = ({ engineBreadcrumb }) => {
  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, RESULT_SETTINGS_TITLE]} />
      <EuiPageHeader pageTitle={RESULT_SETTINGS_TITLE} />
      <EuiPageContent>
        <EuiPageContentBody>
          <FlashMessages />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
