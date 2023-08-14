/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockGraphStore, MockedGraphEnvironment } from './mocks';
import { syncSettingsSaga, updateSettings } from './advanced_settings';
import {
  updateSaveButtonSaga,
  syncFieldsSaga,
  syncNodeStyleSaga,
  selectField,
  updateFieldProperties,
} from './fields';
import { AdvancedSettings, WorkspaceField, WorkspaceNode } from '../types';
import { loadTemplates, syncTemplatesSaga } from './url_templates';

/**
 * This suite tests all the sagas that only exist to sync the legacy world
 * with the redux state management. They can be discarded once everything is
 * migrated.
 */
describe('legacy sync sagas', () => {
  let env: MockedGraphEnvironment;

  beforeEach(() => {
    env = createMockGraphStore({
      sagas: [
        syncSettingsSaga,
        updateSaveButtonSaga,
        syncFieldsSaga,
        syncNodeStyleSaga,
        syncTemplatesSaga,
      ],
      initialStateOverwrites: {
        fields: {
          field1: {
            name: 'field1',
            color: 'black',
          } as WorkspaceField,
        },
      },
    });
    env.mockedDeps.getWorkspace()!.nodes.push({
      color: 'pink',
      data: {
        field: 'field1',
        term: 'A',
      },
      icon: {
        id: 'a',
        package: 'eui',
        label: '',
        prevName: 'a',
      },
    } as WorkspaceNode);
    env.mockedDeps.getWorkspace()!.nodes.push({
      color: 'pink',
      data: {
        field: 'field2',
        term: 'B',
      },
      icon: {
        id: 'b',
        package: 'eui',
        label: '',
        prevName: 'b',
      },
    } as WorkspaceNode);
  });

  it('syncs settings with workspace', () => {
    const newSettings = {} as AdvancedSettings;
    env.store.dispatch(updateSettings(newSettings));
    expect(env.mockedDeps.getWorkspace()!.options.exploreControls).toBe(newSettings);
  });

  it('syncs templates with workspace', () => {
    env.store.dispatch(loadTemplates([]));
    expect(env.mockedDeps.notifyReact).toHaveBeenCalled();
  });

  it('notifies react when fields are selected', () => {
    env.store.dispatch(selectField('field1'));
    expect(env.mockedDeps.notifyReact).toHaveBeenCalled();
  });

  it('syncs field list with workspace', () => {
    env.store.dispatch(selectField('field1'));
    env.store.dispatch(
      updateFieldProperties({
        fieldName: 'field1',
        fieldProperties: {
          hopSize: 22,
        },
      })
    );
    const workspace = env.mockedDeps.getWorkspace()!;
    expect(workspace.options.vertex_fields![0].name).toEqual('field1');
    expect(workspace.options.vertex_fields![0].hopSize).toEqual(22);
  });

  it('syncs styles with nodes', () => {
    env.store.dispatch(
      updateFieldProperties({
        fieldName: 'field1',
        fieldProperties: {
          color: 'red',
          icon: {
            id: 'x',
            package: 'eui',
            label: '',
            prevName: 'x',
          },
        },
      })
    );
    const workspace = env.mockedDeps.getWorkspace()!;
    expect(workspace.nodes[0].color).toEqual('red');
    expect(workspace.nodes[0].icon.id).toEqual('x');
    expect(workspace.nodes[1].color).toEqual('pink');
    expect(workspace.nodes[1].icon.id).toEqual('b');
  });
});
