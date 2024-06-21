/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleTestSetup, HelpSidePanelSelectorsAndActions } from '../../../console/mocks';
import {
  getConsoleTestSetup,
  getHelpSidePanelSelectorsAndActionsMock,
} from '../../../console/mocks';
import { getEndpointConsoleCommands } from '../..';
import { EndpointMetadataGenerator } from '../../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import { sortBy } from 'lodash';
import { HELP_GROUPS } from '../console_commands_definition';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import type { CommandDefinition } from '../../../console';
import type { HostMetadataInterface } from '../../../../../../common/endpoint/types';

jest.mock('../../../../../common/experimental_features_service');

describe('When displaying Endpoint Response Actions', () => {
  let render: ConsoleTestSetup['renderConsole'];
  let renderResult: ReturnType<typeof render>;
  let consoleSelectors: ConsoleTestSetup['selectors'];
  let helpPanelSelectors: HelpSidePanelSelectorsAndActions;
  let commands: CommandDefinition[];
  let endpointMetadata: HostMetadataInterface;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();
    endpointMetadata = new EndpointMetadataGenerator().generate();
    consoleSelectors = testSetup.selectors;
    render = (props = { commands }) => {
      renderResult = testSetup.renderConsole(props);
      helpPanelSelectors = getHelpSidePanelSelectorsAndActionsMock(renderResult);

      return renderResult;
    };
  });

  describe('for agent type endpoint', () => {
    beforeEach(() => {
      (ExperimentalFeaturesService.get as jest.Mock).mockReturnValueOnce({
        responseActionUploadEnabled: true,
      });
      commands = getEndpointConsoleCommands({
        agentType: 'endpoint',
        endpointAgentId: '123',
        endpointCapabilities: endpointMetadata.Endpoint.capabilities ?? [],
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });
    });

    it('should display expected help groups', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();

      expect(helpPanelSelectors.getHelpGroupLabels()).toEqual([
        ...sortBy(Object.values(HELP_GROUPS), 'position').map((group) => group.label),
        'Supporting commands & parameters',
      ]);
    });

    it('should display response action commands in the help panel in expected order', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();
      const commandsInPanel = helpPanelSelectors.getHelpCommandNames(
        HELP_GROUPS.responseActions.label
      );

      expect(commandsInPanel).toEqual([
        'isolate',
        'release',
        'status',
        'processes',
        'kill-process --pid',
        'suspend-process --pid',
        'get-file --path',
        'execute --command',
        'upload --file',
      ]);
    });
  });

  describe('for agent type sentinel_one', () => {
    beforeEach(() => {
      (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
        responseActionsCrowdstrikeManualHostIsolationEnabled: true,
        responseActionsSentinelOneV1Enabled: true,
        responseActionsSentinelOneGetFileEnabled: true,
      });

      commands = getEndpointConsoleCommands({
        agentType: 'sentinel_one',
        endpointAgentId: '123',
        endpointCapabilities: endpointMetadata.Endpoint.capabilities ?? [],
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });
    });

    it('should display expected help groups', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();

      expect(helpPanelSelectors.getHelpGroupLabels()).toEqual([
        ...sortBy(Object.values(HELP_GROUPS), 'position').map((group) => group.label),
        'Supporting commands & parameters',
      ]);
    });

    it('should display response action commands in the help panel in expected order', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();
      const commandsInPanel = helpPanelSelectors.getHelpCommandNames(
        HELP_GROUPS.responseActions.label
      );

      expect(commandsInPanel).toEqual(['isolate', 'release', 'get-file --path']);
    });
  });

  describe('for agent type crowdstrike', () => {
    beforeEach(() => {
      (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
        responseActionsCrowdstrikeManualHostIsolationEnabled: true,
      });
      commands = getEndpointConsoleCommands({
        agentType: 'crowdstrike',
        endpointAgentId: '123',
        endpointCapabilities: endpointMetadata.Endpoint.capabilities ?? [],
        endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      });
    });

    it('should display expected help groups', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();

      expect(helpPanelSelectors.getHelpGroupLabels()).toEqual([
        ...sortBy(Object.values(HELP_GROUPS), 'position').map((group) => group.label),
        'Supporting commands & parameters',
      ]);
    });

    it('should display response action commands in the help panel in expected order', () => {
      render({ commands });
      consoleSelectors.openHelpPanel();
      const commandsInPanel = helpPanelSelectors.getHelpCommandNames(
        HELP_GROUPS.responseActions.label
      );

      expect(commandsInPanel).toEqual(['isolate', 'release']);
    });
  });
});
