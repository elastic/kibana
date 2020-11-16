/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageHeader, EuiPageHeaderSection, EuiTitle, EuiPageContentBody } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { DOCUMENTS_TITLE } from './constants';

interface Props {
  engineBreadcrumb: string[];
}

export const Documents: React.FC<Props> = ({ engineBreadcrumb }) => {
  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, DOCUMENTS_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{DOCUMENTS_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContentBody />
    </>
  );
};
