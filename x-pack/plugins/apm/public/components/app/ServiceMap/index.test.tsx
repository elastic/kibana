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
import { EuiThemeProvider } from '../../../../../observability/public';
import { FETCH_STATUS } from '../../../../../observability/public/hooks/use_fetcher';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { LicenseContext } from '../../../context/LicenseContext';
import * as useFetcherModule from '../../../hooks/useFetcher';
import { ServiceMap } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const activeLicense = new License({
  signature: 'active test signature',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'active',
    type: 'platinum',
    uid: '1',
  },
});

const expiredLicense = new License({
  signature: 'expired test signature',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'expired',
    type: 'platinum',
    uid: '1',
  },
});

function createWrapper(license: License | null) {
  return ({ children }: { children?: ReactNode }) => {
    return (
      <EuiThemeProvider>
        <KibanaReactContext.Provider>
          <LicenseContext.Provider value={license || undefined}>
            <MockApmPluginContextWrapper>
              {children}
            </MockApmPluginContextWrapper>
          </LicenseContext.Provider>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    );
  };
}

describe('ServiceMap', () => {
  describe('with no license', () => {
    it('renders null', async () => {
      expect(
        await render(<ServiceMap />, {
          wrapper: createWrapper(null),
        }).queryByTestId('ServiceMap')
      ).not.toBeInTheDocument();
    });
  });

  describe('with an expired license', () => {
    it('renders the license banner', async () => {
      expect(
        await render(<ServiceMap />, {
          wrapper: createWrapper(expiredLicense),
        }).findAllByText(/Platinum/)
      ).toHaveLength(1);
    });
  });

  describe('with an active license', () => {
    describe('with an empty response', () => {
      it('renders the empty banner', async () => {
        jest.spyOn(useFetcherModule, 'useFetcher').mockReturnValueOnce({
          data: { elements: [] },
          refetch: () => {},
          status: FETCH_STATUS.SUCCESS,
        });

        expect(
          await render(<ServiceMap />, {
            wrapper: createWrapper(activeLicense),
          }).findAllByText(/No services available/)
        ).toHaveLength(1);
      });
    });
  });
});
