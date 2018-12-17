/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeader, EuiHeaderBreadcrumbs, EuiHeaderSection } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';

interface LegacyHeaderProps {
  breadcrumbs?: Breadcrumb[];
  appendSections?: React.ReactNode;
}

export const LegacyHeader: React.SFC<LegacyHeaderProps> = ({
  appendSections,
  breadcrumbs = [],
}) => (
  <HeaderWrapper>
    <EuiHeaderSection grow>
      <EuiHeaderBreadcrumbs breadcrumbs={breadcrumbs} />
    </EuiHeaderSection>
    {appendSections}
  </HeaderWrapper>
);

const HeaderWrapper = styled(EuiHeader)`
  height: 29px;
`;
