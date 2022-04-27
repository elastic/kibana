/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { LinkToApp } from './link_to_app';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';

type LinkToAppOnClickMock<Return = void> = jest.Mock<
  Return,
  [React.MouseEvent<HTMLAnchorElement, MouseEvent>]
>;

describe('LinkToApp component', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  const render = (ui: Parameters<typeof mount>[0]) =>
    mount(ui, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: { application: fakeCoreStart.application },
      },
    });

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart();
  });

  it('should render with minimum input', () => {
    expect(render(<LinkToApp appId="fleet">{'link'}</LinkToApp>)).toMatchSnapshot();
  });
  it('should render with href', () => {
    expect(
      render(
        <LinkToApp appId="fleet" href="/app/fleet">
          {'link'}
        </LinkToApp>
      )
    ).toMatchSnapshot();
  });
  it('should support onClick prop', () => {
    // Take `_event` (even though it is not used) so that `jest.fn` will have a type that expects to be called with an event
    const spyOnClickHandler: LinkToAppOnClickMock = jest.fn().mockImplementation((_event) => {});
    const renderResult = render(
      <LinkToApp appId="fleet" href="/app/fleet" onClick={spyOnClickHandler}>
        {'link'}
      </LinkToApp>
    );

    renderResult.find('EuiLink').simulate('click', { button: 0 });
    const clickEventArg = spyOnClickHandler.mock.calls[0][0];

    expect(spyOnClickHandler).toHaveBeenCalled();
    expect(clickEventArg.preventDefault).toBeInstanceOf(Function);
    expect(clickEventArg.isDefaultPrevented()).toBe(true);
    expect(fakeCoreStart.application.navigateToApp).toHaveBeenCalledWith('fleet', {
      path: undefined,
      state: undefined,
    });
  });
  it('should navigate to App with specific path', () => {
    const renderResult = render(
      <LinkToApp appId="fleet" appPath="/some/path" href="/app/fleet">
        {'link'}
      </LinkToApp>
    );
    renderResult.find('EuiLink').simulate('click', { button: 0 });
    expect(fakeCoreStart.application.navigateToApp).toHaveBeenCalledWith('fleet', {
      path: '/some/path',
      state: undefined,
    });
  });
  it('should passes through EuiLinkProps', () => {
    const renderResult = render(
      <LinkToApp
        appId="fleet"
        appPath="/some/path"
        href="/app/fleet"
        className="my-class"
        color="primary"
        data-test-subj="my-test-subject"
      >
        {'link'}
      </LinkToApp>
    );
    expect(renderResult.find('EuiLink').props()).toEqual({
      children: 'link',
      className: 'my-class',
      color: 'primary',
      'data-test-subj': 'my-test-subject',
      href: '/app/fleet',
      onClick: expect.any(Function),
    });
  });
  it('should still preventDefault if onClick callback throws', () => {
    // Take `_event` (even though it is not used) so that `jest.fn` will have a type that expects to be called with an event
    const spyOnClickHandler = jest.fn().mockImplementation((_event) => {
      throw new Error('test');
    });
    // eslint-disable-next-line no-empty
    try {
    } catch (e) {
      const renderResult = render(
        <LinkToApp appId="fleet" href="/app/fleet" onClick={spyOnClickHandler}>
          {'link'}
        </LinkToApp>
      );
      expect(() => renderResult.find('EuiLink').simulate('click')).toThrowError();
      const clickEventArg = spyOnClickHandler.mock.calls[0][0];
      expect(clickEventArg.isDefaultPrevented()).toBe(true);
    }
  });
  it('should not navigate if onClick callback prevents default', () => {
    const spyOnClickHandler: LinkToAppOnClickMock = jest.fn().mockImplementation((ev) => {
      ev.preventDefault();
    });
    const renderResult = render(
      <LinkToApp appId="fleet" href="/app/fleet" onClick={spyOnClickHandler}>
        {'link'}
      </LinkToApp>
    );
    renderResult.find('EuiLink').simulate('click', { button: 0 });
    expect(fakeCoreStart.application.navigateToApp).not.toHaveBeenCalled();
  });
  it('should not to navigate if it was not left click', () => {
    const renderResult = render(<LinkToApp appId="fleet">{'link'}</LinkToApp>);
    renderResult.find('EuiLink').simulate('click', { button: 1 });
    expect(fakeCoreStart.application.navigateToApp).not.toHaveBeenCalled();
  });
  it('should not to navigate if it includes an anchor target', () => {
    const renderResult = render(
      <LinkToApp appId="fleet" target="_blank" href="/some/path">
        {'link'}
      </LinkToApp>
    );
    renderResult.find('EuiLink').simulate('click', { button: 0 });
    expect(fakeCoreStart.application.navigateToApp).not.toHaveBeenCalled();
  });
  it('should not to navigate if if meta|alt|ctrl|shift keys are pressed', () => {
    const renderResult = render(
      <LinkToApp appId="fleet" target="_blank">
        {'link'}
      </LinkToApp>
    );
    const euiLink = renderResult.find('EuiLink');
    ['meta', 'alt', 'ctrl', 'shift'].forEach((key) => {
      euiLink.simulate('click', { button: 0, [`${key}Key`]: true });
      expect(fakeCoreStart.application.navigateToApp).not.toHaveBeenCalled();
    });
  });
});
