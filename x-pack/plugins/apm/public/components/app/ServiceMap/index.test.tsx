/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import React, { ReactNode } from 'react';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { License } from '../../../../../licensing/common/license';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { LicenseContext } from '../../../context/LicenseContext';
import { ServiceMap } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiStats: () => {} },
} as Partial<CoreStart>);

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

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <KibanaReactContext.Provider>
      <LicenseContext.Provider value={expiredLicense}>
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </LicenseContext.Provider>
    </KibanaReactContext.Provider>
  );
}

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
