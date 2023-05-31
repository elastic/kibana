/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links';

export const EngineHeaderDocsAction: React.FC = () => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <EuiButtonEmpty
        data-telemetry-id="entSearchApplications-engineHeader-documentationLink"
        data-test-subj="engine-documentation-link"
        href={docLinks.searchApplications}
        target="_blank"
        iconType="documents"
      >
        {i18n.translate('xpack.enterpriseSearch.content.engine.header.searchApplicationsDoc', {
          defaultMessage: 'Search Applications Doc',
        })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);
