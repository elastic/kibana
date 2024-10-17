/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandDefinition, ConsoleProps } from '..';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import type { ConsoleTestSetup } from '../mocks';
import { getConsoleTestSetup } from '../mocks';

describe('ValidationError component', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let command: CommandDefinition;
  let enterCommand: ConsoleTestSetup['enterCommand'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();
    let commands: CommandDefinition[];

    ({ commands, enterCommand } = testSetup);
    command = commands[0];
    command.validate = () => 'this command is not active';

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display message and help output if command is not hidden from help', async () => {
    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'this command is not active'
    );
    expect(renderResult.getByTestId('test-validationError-commandUsage'));
  });

  it('should only display message (no help) if command is hidden from help', async () => {
    command.helpHidden = true;
    render();
    await enterCommand('cmd1');

    expect(renderResult.getByTestId('test-validationError-message').textContent).toEqual(
      'this command is not active'
    );
    expect(renderResult.queryByTestId('test-validationError-commandUsage')).toBeNull();
  });
});
