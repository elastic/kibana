/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../__mocks__/kea_logic';
import { mockHistory } from '../../__mocks__/react_router';

import { generateReactRouterProps } from '.';

describe('generateReactRouterProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates React-Router-friendly href and onClick props', () => {
    expect(generateReactRouterProps({ to: '/hello/world' })).toEqual({
      href: '/app/enterprise_search/hello/world',
      onClick: expect.any(Function),
    });
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  it('renders with the correct non-basenamed href when shouldNotCreateHref is passed', () => {
    expect(generateReactRouterProps({ to: '/hello/world', shouldNotCreateHref: true })).toEqual({
      href: '/hello/world',
      onClick: expect.any(Function),
    });
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history', () => {
      const mockEvent = {
        button: 0,
        target: { getAttribute: () => '_self' },
        preventDefault: jest.fn(),
      } as any;

      const { onClick } = generateReactRouterProps({ to: '/test' });
      onClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockKibanaValues.navigateToUrl).toHaveBeenCalled();
    });

    it('does not prevent default browser behavior on new tab/window clicks', () => {
      const mockEvent = {
        shiftKey: true,
        target: { getAttribute: () => '_blank' },
      } as any;

      const { onClick } = generateReactRouterProps({ to: '/test' });
      onClick(mockEvent);

      expect(mockKibanaValues.navigateToUrl).not.toHaveBeenCalled();
    });

    it('calls inherited onClick actions in addition to default navigation', () => {
      const mockEvent = { preventDefault: jest.fn() } as any;
      const customOnClick = jest.fn(); // Can be anything from telemetry to a state reset

      const { onClick } = generateReactRouterProps({ to: '/test', onClick: customOnClick });
      onClick(mockEvent);

      expect(customOnClick).toHaveBeenCalled();
    });
  });
});
