/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TestProviders } from '../../../../../common/mock';

import { ParentProcessDraggable } from './parent_process_draggable';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

describe('ParentProcessDraggable', () => {
  const mount = useMountAppended();

  test('displays the text, endgameParentProcessName, and processPpid when they are all provided', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={456}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('via parent process[endgameParentProcessName](456)');
  });

  test('displays nothing when the text is provided, but endgameParentProcessName and processPpid are both undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('displays the text and processPpid when endgameParentProcessName is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={456}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('via parent process(456)');
  });

  test('displays the processPpid when both endgameParentProcessName and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName={undefined}
          eventId="1"
          processPpid={456}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('(456)');
  });

  test('displays the text and endgameParentProcessName when processPpid is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={undefined}
          text="via parent process"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('via parent process[endgameParentProcessName]');
  });

  test('displays the endgameParentProcessName when both processPpid and text are undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <ParentProcessDraggable
          contextId="test"
          endgameParentProcessName="[endgameParentProcessName]"
          eventId="1"
          processPpid={undefined}
          text={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[endgameParentProcessName]');
  });
});
