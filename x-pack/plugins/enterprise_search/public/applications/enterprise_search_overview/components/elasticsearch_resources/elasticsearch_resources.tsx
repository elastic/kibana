/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiPanel, EuiTitle, EuiLink } from '@elastic/eui';

export const ElasticsearchResources: React.FC = () => (
  <EuiPanel hasShadow={false} color="subdued">
    <EuiTitle size="xs">
      <h4>Resources</h4>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiLink href="#" external>
      Getting started with Elasticsearch
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiLink href="#" external>
      Create a new index
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiLink href="#" external>
      Elasticsearch clients
    </EuiLink>
    <EuiSpacer size="s" />
    <EuiLink href="#" external>
      Search UI for Elasticsearch
    </EuiLink>
  </EuiPanel>
);
