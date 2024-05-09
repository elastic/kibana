/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links';
import { EndpointsHeaderAction } from '../../../shared/layout/endpoints_header_action';

export const SearchApplicationHeaderDocsAction: React.FC = () => (
  <EndpointsHeaderAction>
    <EuiButtonEmpty
      data-telemetry-id="entSearchApplications-searchApplicationHeader-documentationLink"
      data-test-subj="search-applications-documentation-link"
      href={docLinks.searchApplications}
      target="_blank"
      iconType="documents"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.header.searchApplicationsDoc',
        {
          defaultMessage: 'Search Applications Doc',
        }
      )}
    </EuiButtonEmpty>
  </EndpointsHeaderAction>
);
