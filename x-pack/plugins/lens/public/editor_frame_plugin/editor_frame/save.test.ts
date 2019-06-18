/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { save } from './save';
import { Action } from './state_management';

describe('save editor frame state', () => {
  it('dispatches saved status actions before and after saving', async () => {
    let saved = false;

    const dispatch = jest.fn((action: Action) => {
      if (action.type === 'SAVING' && saved) {
        throw new Error('Saving was called after save');
      }
      if (action.type === 'SAVED' && !saved) {
        throw new Error('Saved was called before save');
      }
    });

    await save({
      dispatch,
      redirectTo: jest.fn(),
      state: {
        datasource: { activeId: '1', isLoading: false, state: {} },
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          saved = true;
          return { id: 'foo' };
        },
      },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVED' });
  });

  it('transforms from internal state to persisted doc format', async () => {
    const store = {
      save: jest.fn(async () => ({ id: 'bar' })),
    };
    await save({
      store,
      datasource: {
        getPersistableState(state) {
          return {
            stuff: `${state}_datsource_persisted`,
          };
        },
      },
      dispatch: jest.fn(),
      redirectTo: jest.fn(),
      state: {
        datasource: { activeId: '1', isLoading: false, state: '2' },
        saving: false,
        visualization: { activeId: '3', state: { title: 'Heyo!!!', bar: '4' } },
      },
      visualization: {
        getPersistableState(state) {
          return {
            things: `${(state as { bar: string }).bar}_vis_persisted`,
          };
        },
      },
    });

    expect(store.save).toHaveBeenCalledWith({
      datasourceType: '1',
      id: undefined,
      lensState: {
        datasource: { stuff: '2_datsource_persisted' },
        visualization: { things: '4_vis_persisted' },
      },
      title: 'Heyo!!!',
      type: 'lens',
      visualizationType: '3',
    });
  });

  it('redirects to the edit screen if the id changes', async () => {
    const id = `${Math.random()}`;
    const redirectTo = jest.fn();
    const dispatch = jest.fn();
    await save({
      dispatch,
      redirectTo,
      state: {
        datasource: { activeId: '1', isLoading: false, state: {} },
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          return { id };
        },
      },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_PERSISTED_ID', id });
    expect(redirectTo).toHaveBeenCalledWith(`/edit/${id}`);
  });

  it('does not redirect to the edit screen if the id does not change', async () => {
    const id = `${Math.random()}`;
    const redirectTo = jest.fn();
    const dispatch = jest.fn();
    await save({
      dispatch,
      redirectTo,
      state: {
        datasource: { activeId: '1', isLoading: false, state: {} },
        persistedId: id,
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          return { id };
        },
      },
    });

    expect(dispatch.mock.calls.some(({ type }) => type === 'UPDATE_PERSISTED_ID')).toBeFalsy();
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
