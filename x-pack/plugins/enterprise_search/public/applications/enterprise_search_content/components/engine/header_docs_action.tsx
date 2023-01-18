/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { docLinks } from '../../../shared/doc_links';

export const EngineHeaderDocsAction: React.FC = () => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <EuiButtonEmpty
        data-test-subj="engine-documentation-link"
        href={docLinks.appSearchElasticsearchIndexedEngines} // TODO: replace with real docLinks when it's created
        target="_blank"
        iconType="documents"
      >
        Engine Docs
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);
