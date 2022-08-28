/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { LicensingLogic, ManageLicenseButton } from '../../../shared/licensing';

import { PRODUCT_SELECTOR_CALLOUT_HEADING } from '../../constants';

import { LICENSE_CALLOUT_BODY } from './constants';

export const LicenseCallout: React.FC = () => {
  const { hasPlatinumLicense, isTrial } = useValues(LicensingLogic);

  if (hasPlatinumLicense && !isTrial) return null;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{PRODUCT_SELECTOR_CALLOUT_HEADING}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{LICENSE_CALLOUT_BODY}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem>
        <ManageLicenseButton />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
