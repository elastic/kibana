/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React, { FunctionComponent } from 'react';
import { License } from '../../../../../licensing/common/license';
import { LicenseContext } from '../../../context/LicenseContext';
import { ServiceMap } from './';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';

const expiredLicense = new License({
  signature: 'test signature',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'expired',
    type: 'platinum',
    uid: '1',
  },
});

const Wrapper: FunctionComponent = ({ children }) => {
  return (
    <LicenseContext.Provider value={expiredLicense}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </LicenseContext.Provider>
  );
};

describe('ServiceMap', () => {
  describe('with an inactive license', () => {
    it('renders the license banner', async () => {
      expect(
        (
          await render(<ServiceMap />, {
            wrapper: Wrapper,
          }).findAllByText(/Platinum/)
        ).length
      ).toBeGreaterThan(0);
    });
  });
});
