/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import '../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../common/mock';

import { FileDraggable } from './file_draggable';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

describe('FileDraggable', () => {
  const mount = useMountAppended();

  test('it prefers fileName and filePath over endgameFileName and endgameFilePath when all of them are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName="[endgameFileName]"
          endgameFilePath="[endgameFilePath]"
          eventId="1"
          fileName="[fileName]"
          filePath="[filePath]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[fileName]in[filePath]');
  });

  test('it returns an empty string when none of the files or paths are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders just the endgameFileName if only endgameFileName is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName="[endgameFileName]"
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[endgameFileName]');
  });

  test('it renders "in endgameFilePath" if only endgameFilePath is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath="[endgameFilePath]"
          eventId="1"
          fileName={undefined}
          filePath={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('in[endgameFilePath]');
  });

  test('it renders just the filename if only fileName is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName="[fileName]"
          filePath={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('[fileName]');
  });

  test('it renders "in filePath" if only filePath is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <FileDraggable
          contextId="test"
          endgameFileName={undefined}
          endgameFilePath={undefined}
          eventId="1"
          fileName={undefined}
          filePath="[filePath]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('in[filePath]');
  });
});
