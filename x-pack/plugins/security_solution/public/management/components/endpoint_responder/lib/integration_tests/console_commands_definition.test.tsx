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

describe('When displaying Endpoint Response Actions', () => {
  let render: ConsoleTestSetup['renderConsole'];
  let renderResult: ReturnType<typeof render>;
  let consoleSelectors: ConsoleTestSetup['selectors'];
  let helpPanelSelectors: HelpSidePanelSelectorsAndActions;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    const endpointMetadata = new EndpointMetadataGenerator().generate();
    const commands = getEndpointConsoleCommands({
      agentType: 'endpoint',
      endpointAgentId: '123',
      endpointCapabilities: endpointMetadata.Endpoint.capabilities ?? [],
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
    });

    consoleSelectors = testSetup.selectors;
    render = (props = { commands }) => {
      renderResult = testSetup.renderConsole(props);
      helpPanelSelectors = getHelpSidePanelSelectorsAndActionsMock(renderResult);

      return renderResult;
    };
  });

  it('should display expected help groups', () => {
    render();
    consoleSelectors.openHelpPanel();

    expect(helpPanelSelectors.getHelpGroupLabels()).toEqual([
      ...sortBy(Object.values(HELP_GROUPS), 'position').map((group) => group.label),
      'Supporting commands & parameters',
    ]);
  });

  it('should display response action commands in the help panel in expected order', () => {
    render();
    consoleSelectors.openHelpPanel();
    const commands = helpPanelSelectors.getHelpCommandNames(HELP_GROUPS.responseActions.label);

    expect(commands).toEqual([
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
