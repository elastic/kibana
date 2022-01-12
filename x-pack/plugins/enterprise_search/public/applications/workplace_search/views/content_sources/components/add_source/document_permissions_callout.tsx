/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { docLinks } from '../../../../../shared/doc_links';
import { EXPLORE_PLATINUM_FEATURES_LINK } from '../../../../constants';

import {
  SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE,
  SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_TITLE,
} from './constants';

export const DocumentPermissionsCallout: React.FC = () => {
  return (
    <>
      <EuiPanel paddingSize="l" data-test-subj="DocumentLevelPermissionsCallout">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type="lock" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_TITLE}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <p>{SOURCE_FEATURES_DOCUMENT_LEVEL_PERMISSIONS_FEATURE}</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs">
          <EuiLink external target="_blank" href={docLinks.licenseManagement}>
            {EXPLORE_PLATINUM_FEATURES_LINK}
          </EuiLink>
        </EuiText>
      </EuiPanel>
      <EuiSpacer />
    </>
  );
};
