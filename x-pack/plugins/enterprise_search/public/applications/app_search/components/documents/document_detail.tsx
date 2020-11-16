/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageHeader, EuiPageHeaderSection, EuiTitle, EuiPageContentBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

interface Props {
  engineBreadcrumb: string[];
}

export const DocumentDetail: React.FC<Props> = ({ engineBreadcrumb }) => {
  const DOCUMENT_DETAIL_TITLE = i18n.translate(
    'xpack.enterpriseSearch.appSearch.documentDetail.title',
    {
      defaultMessage: 'Document Detail',
    }
  );

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, DOCUMENT_DETAIL_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{DOCUMENT_DETAIL_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContentBody />
    </>
  );
};
