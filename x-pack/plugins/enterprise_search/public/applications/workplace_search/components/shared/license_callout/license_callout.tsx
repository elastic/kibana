/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';

import { ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../routes';

interface LicenseCalloutProps {
  message?: string;
}

export const LicenseCallout: React.FC<LicenseCalloutProps> = ({ message }) => {
  const title = (
    <>
      {message}{' '}
      <EuiLink target="_blank" external href={ENT_SEARCH_LICENSE_MANAGEMENT}>
        <strong>Explore Platinum features</strong>
      </EuiLink>
    </>
  );

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <div>
            <strong>&#8593;</strong>
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{title}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
