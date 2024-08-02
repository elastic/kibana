/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ConsoleLinkButton } from './console_link_button';

export const SearchHomepageBody = () => (
  <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <ConsoleLinkButton />
      </EuiFlexItem>
    </EuiFlexGroup>
  </KibanaPageTemplate.Section>
);
