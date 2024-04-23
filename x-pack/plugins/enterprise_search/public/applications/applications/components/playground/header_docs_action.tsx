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

export const PlaygroundHeaderDocsAction: React.FC = () => (
  <EndpointsHeaderAction>
    <EuiButtonEmpty
      data-telemetry-id="entSearchApplications-playground-documentationLink"
      data-test-subj="playground-documentation-link"
      href={docLinks.playground}
      target="_blank"
      iconType="documents"
    >
      {i18n.translate('xpack.enterpriseSearch.content.playground.header.docLink', {
        defaultMessage: 'Playground Docs',
      })}
    </EuiButtonEmpty>
  </EndpointsHeaderAction>
);
