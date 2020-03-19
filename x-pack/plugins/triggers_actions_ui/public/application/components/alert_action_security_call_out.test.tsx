/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { AlertActionSecurityCallOut } from './alert_action_security_call_out';

import { EuiCallOut, EuiButton } from '@elastic/eui';
import { act } from 'react-dom/test-utils';

const docLinks = { ELASTIC_WEBSITE_URL: 'elastic.co/', DOC_LINK_VERSION: 'current' };

describe('alert action security call out', () => {
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
      component = shallow(
        <AlertActionSecurityCallOut action="created" getHealth={health} docLinks={docLinks} />
      );
    });

    expect(component?.is(Fragment)).toBeTruthy();
    expect(component?.html()).toBe('');
  });

  test('renders nothing if keys are enabled', async () => {
    const health = jest.fn();

    health.mockResolvedValue({ canGenerateApiKeys: true });

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(
        <AlertActionSecurityCallOut action="created" getHealth={health} docLinks={docLinks} />
      );
    });

    expect(component?.is(Fragment)).toBeTruthy();
    expect(component?.html()).toBe('');
  });

  test('renders the callout if keys are disabled', async () => {
    const health = jest.fn();

    health.mockResolvedValue({ canGenerateApiKeys: false });

    let component: ShallowWrapper | undefined;
    await act(async () => {
      component = shallow(
        <AlertActionSecurityCallOut action="created" getHealth={health} docLinks={docLinks} />
      );
    });

    expect(component?.find(EuiCallOut).prop('title')).toMatchInlineSnapshot(
      `"Alerts cannot be created while TLS is not enabled."`
    );

    expect(component?.find(EuiButton).prop('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/configuring-tls.html"`
    );
  });
});
