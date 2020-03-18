/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { SecurityEnabledCallOut } from './security_call_out';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

beforeEach(() => jest.resetAllMocks());

const docLinks = { ELASTIC_WEBSITE_URL: 'elastic.co/', DOC_LINK_VERSION: 'current' };

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

  test('renders nothing while health is loading', async () => {
    const health = jest.fn();

    health.mockImplementationOnce(() => new Promise(() => {}));

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut health={health} docLinks={docLinks} />);
    });

    expect(component?.is(Fragment)).toBeTruthy();
    expect(component?.html()).toBe('');
  });

  test('renders nothing if keys are enabled', async () => {
    const health = jest.fn();

    health.mockResolvedValue({ canGenerateApiKeys: true });

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut health={health} docLinks={docLinks} />);
    });

    expect(component?.is(Fragment)).toBeTruthy();
    expect(component?.html()).toBe('');
  });

  test('renders the callout if keys are disabled', async () => {
    const health = jest.fn();

    health.mockImplementationOnce(async () => ({ canGenerateApiKeys: false }));

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(<SecurityEnabledCallOut health={health} docLinks={docLinks} />);
    });

    expect(component?.find(EuiCallOut).prop('title')).toMatchInlineSnapshot(
      `"Transport Layer Security is not enabled"`
    );

    expect(component?.find(EuiButton).prop('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/configuring-tls.html"`
    );
  });
});

function waitForUseEffect() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}
