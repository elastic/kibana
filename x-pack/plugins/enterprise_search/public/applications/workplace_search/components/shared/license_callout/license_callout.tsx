/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';

import { EXPLORE_PLATINUM_FEATURES_LINK } from '../../../constants';

interface LicenseCalloutProps {
  message?: string;
}

export const LicenseCallout: React.FC<LicenseCalloutProps> = ({ message }) => {
  const title = (
    <>
      {message}{' '}
      <EuiLink target="_blank" external href={docLinks.licenseManagement}>
        <strong>{EXPLORE_PLATINUM_FEATURES_LINK}</strong>
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
