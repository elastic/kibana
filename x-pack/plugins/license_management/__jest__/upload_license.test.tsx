/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { LocationDescriptorObject } from 'history';
import { httpServiceMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { mountWithIntl } from '@kbn/test-jest-helpers';

// @ts-ignore
import { uploadLicense } from '../public/application/store/actions/upload_license';

// @ts-ignore
import { licenseManagementStore } from '../public/application/store/store';

// @ts-ignore
import { UploadLicense } from '../public/application/sections/upload_license';
import { AppContextProvider } from '../public/application/app_context';

import {
  UPLOAD_LICENSE_EXPIRED,
  UPLOAD_LICENSE_REQUIRES_ACK,
  UPLOAD_LICENSE_SUCCESS,
  UPLOAD_LICENSE_TLS_NOT_ENABLED,
  UPLOAD_LICENSE_INVALID,
  // @ts-ignore
} from './api_responses';

let store: any = null;
let component: any = null;
const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}${location.search ? '?' + location.search : ''}`;
});

const appDependencies = {
  plugins: {
    licensing: {
      refresh: jest.fn(),
    },
  },
  services: {
    history,
  },
  docLinks: {},
};

const thunkServices = {
  http: httpServiceMock.createSetupContract(),
  history,
  breadcrumbService: {
    setBreadcrumbs() {},
  },
  licensing: appDependencies.plugins.licensing,
};

describe('UploadLicense', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        reload: jest.fn(),
      },
    });
  });

  beforeEach(() => {
    store = licenseManagementStore({}, thunkServices);
    component = (
      <AppContextProvider value={appDependencies as any}>
        <Provider store={store}>
          <UploadLicense history={history} />
        </Provider>
      </AppContextProvider>
    );
    appDependencies.plugins.licensing.refresh.mockResolvedValue({});
  });

  afterEach(() => {
    appDependencies.plugins.licensing.refresh.mockReset();
    thunkServices.history.replace.mockReset();
    jest.clearAllMocks();
  });

  it('should display an error when submitting invalid JSON', async () => {
    const rendered = mountWithIntl(component);
    store.dispatch(uploadLicense('INVALID', 'trial'));
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display an error when ES says license is invalid', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_INVALID[2]));
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(invalidLicense)(store.dispatch, null, thunkServices);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display an error when ES says license is expired', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_EXPIRED[2]));
    const rendered = mountWithIntl(component);
    const invalidLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(invalidLicense)(store.dispatch, null, thunkServices);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });

  it('should display a modal when license requires acknowledgement', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_REQUIRES_ACK[2]));
    const unacknowledgedLicense = JSON.stringify({
      license: { type: 'basic' },
    });
    await uploadLicense(unacknowledgedLicense, 'trial')(store.dispatch, null, thunkServices);
    const rendered = mountWithIntl(component);
    expect(rendered).toMatchSnapshot();
  });

  it('should refresh xpack info and navigate to BASE_PATH when ES accepts new license', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_SUCCESS[2]));
    const validLicense = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(validLicense)(store.dispatch, null, thunkServices);
    expect(appDependencies.plugins.licensing.refresh).toHaveBeenCalled();
    expect(thunkServices.history.replace).toHaveBeenCalled();
  });

  it('should display error when ES returns error', async () => {
    thunkServices.http.put.mockResolvedValue(JSON.parse(UPLOAD_LICENSE_TLS_NOT_ENABLED[2]));
    const rendered = mountWithIntl(component);
    const license = JSON.stringify({ license: { type: 'basic' } });
    await uploadLicense(license)(store.dispatch, null, thunkServices);
    rendered.update();
    expect(rendered).toMatchSnapshot();
  });
});
