/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { httpServiceMock } from 'src/core/public/mocks';
import { SecurityEnabledCallOut } from './security_call_out';

import { EuiCallOut } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

beforeEach(() => jest.resetAllMocks());

describe('security call out', () => {
  let useEffect: any;

  const mockUseEffect = () => {
    // make react execute useEffects despite shallow rendering
    useEffect.mockImplementationOnce((f: Function) => f());
  };

  beforeEach(() => {
    useEffect = jest.spyOn(React, 'useEffect');
    mockUseEffect();
  });

  test('renders nothing while http is loading', async () => {
    const http = httpServiceMock.createSetupContract();

    http.get.mockImplementationOnce(() => waitForUseEffect());

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut http={http} />);
    });

    expect(component?.is(Fragment)).toBeTruthy();
  });

  test('renders nothing if keys are enabled', async () => {
    const http = httpServiceMock.createSetupContract();

    http.get.mockResolvedValue({ areApiKeysEnabled: true });

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut http={http} />);
    });

    expect(component?.is(Fragment)).toBeTruthy();
  });

  test('renders nothing if api call fails as it means security is likely disabled', async () => {
    const http = httpServiceMock.createSetupContract();

    http.get.mockImplementationOnce(async () => {
      throw new Error('Bad Request');
    });

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut http={http} />);
    });

    expect(component?.is(Fragment)).toBeTruthy();
  });

  test('renders the callout if keys are disabled', async () => {
    const http = httpServiceMock.createSetupContract();

    http.get.mockImplementationOnce(async () => ({ areApiKeysEnabled: false }));

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut http={http} />);
    });

    expect(component?.find(EuiCallOut).prop('title')).toMatchInlineSnapshot(
      `"Transport Layer Security is not enabled"`
    );
  });
});

function waitForUseEffect() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
