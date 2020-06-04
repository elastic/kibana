/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { ExitCodeDraggable } from './exit_code_draggable';

describe('ExitCodeDraggable', () => {
  const mount = useMountAppended();

  test('it renders the expected text and exit code, when both text and an endgameExitCode are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="0" eventId="1" text="with exit code" />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('with exit code0');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          contextId="test"
          endgameExitCode={undefined}
          eventId="1"
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable
          contextId="test"
          endgameExitCode={null}
          eventId="1"
          text="with exit code"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when text is provided, but endgameExitCode is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="" eventId="1" text="with exit code" />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders just the exit code when text is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the exit code when text is null', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text={null} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('it renders just the exit code when text is an empty string', () => {
    const wrapper = mount(
      <TestProviders>
        <ExitCodeDraggable contextId="test" endgameExitCode="1" eventId="1" text="" />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });
});
