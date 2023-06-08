/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../mock';

import type { UninstallCommandFlyoutProps } from './uninstall_command_flyout';
import { UninstallCommandFlyout } from './uninstall_command_flyout';
import { useCommands } from './hooks';
import type { Commands } from './types';

jest.mock('./hooks', () => ({
  useCommands: jest.fn(),
}));

describe('UninstallCommandFlyout', () => {
  const defaultCommands: Commands = {
    linux: 'command for linux',
    mac: 'command for mac',
    deb: 'commands for deb',
    windows: 'commands for windows',
    rpm: 'commands for rpm',
  };
  const useCommandsMock = useCommands as jest.Mock;

  const render = (props: Partial<UninstallCommandFlyoutProps> = {}) => {
    const renderer = createFleetTestRendererMock();

    return renderer.render(
      <UninstallCommandFlyout onClose={() => {}} target="agent" policyId="-" {...props} />
    );
  };

  beforeEach(() => {
    useCommandsMock.mockReturnValue(defaultCommands);
  });

  describe('uninstall command targets', () => {
    it('renders flyout for Agent', () => {
      const renderResult = render({ target: 'agent' });

      expect(renderResult.queryByText(/Uninstall Elastic Agent on your host/)).toBeInTheDocument();
      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).not.toBeInTheDocument();
    });

    it('renders flyout for Endpoint integration', () => {
      const renderResult = render({ target: 'endpoint' });

      expect(renderResult.queryByText(/Uninstall Elastic Defend/)).toBeInTheDocument();
      expect(
        renderResult.queryByText(/Uninstall Elastic Agent on your host/)
      ).not.toBeInTheDocument();
    });
  });

  describe('rendering commands only for received platforms', () => {
    it('renders commands for e.g. Linux and Mac', () => {
      useCommandsMock.mockReturnValue({
        linux: 'command for linux',
        mac: 'command for mac',
      });

      const renderResult = render();

      const platformsButtonGroup = renderResult.getByTestId(
        'uninstall-commands-flyout-platforms-btn-group'
      );
      expect(platformsButtonGroup).toHaveTextContent('Mac');
      expect(platformsButtonGroup).toHaveTextContent('Linux');
      expect(platformsButtonGroup).not.toHaveTextContent('Windows');
      expect(platformsButtonGroup).not.toHaveTextContent('RPM');
      expect(platformsButtonGroup).not.toHaveTextContent('DEB');
    });

    it('renders commands for e.g. Mac, Windows, DEB and RPM', () => {
      useCommandsMock.mockReturnValue({
        mac: 'command for mac',
        deb: 'commands for deb',
        windows: 'commands for windows',
        rpm: 'commands for rpm',
      });

      const renderResult = render();

      const platformsButtonGroup = renderResult.getByTestId(
        'uninstall-commands-flyout-platforms-btn-group'
      );
      expect(platformsButtonGroup).toHaveTextContent('Mac');
      expect(platformsButtonGroup).toHaveTextContent('Windows');
      expect(platformsButtonGroup).toHaveTextContent('RPM');
      expect(platformsButtonGroup).toHaveTextContent('DEB');
      expect(platformsButtonGroup).not.toHaveTextContent('Linux');
    });
  });
});
