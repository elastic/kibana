/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import actionsCreator, { actionCreatorFactory } from './index';

describe('action creator', () => {
  describe('#default', () => {
    test('it creates multiple action creators from Array', () => {
      const actions = actionsCreator(['actionOne', 'actionTwo']);
      expect(actions).toEqual({
        actionOne: expect.any(Function),
        actionTwo: expect.any(Function),
      });
      expect(actions.actionOne.toString()).toEqual('actionOne');
      expect(actions.actionOne.type).toEqual('actionOne');
    });
    test('it creates multiple action creators from Set', () => {
      const actions = actionsCreator(new Set(['actionOne', 'actionTwo']));
      expect(actions).toEqual({
        actionOne: expect.any(Function),
        actionTwo: expect.any(Function),
      });
      expect(actions.actionOne.toString()).toEqual('actionOne');
      expect(actions.actionOne.type).toEqual('actionOne');
    });
  });

  describe('#actionCreatorFactory', () => {
    type PayloadWithOneArg = [{ data: { [key: string]: any } }];
    type PayloadWithTwoArgs = [{ data: { [key: string]: any } }, Set<string>];

    test('action creator returns expected object', () => {
      const getAction = actionCreatorFactory<'actionOne', PayloadWithOneArg>('actionOne');
      expect(getAction({ data: { one: 1, two: 2 } })).toEqual({
        type: 'actionOne',
        payload: [{ data: { one: 1, two: 2 } }],
      });

      const getActionWithMultiPayload = actionCreatorFactory<'actionOne', PayloadWithTwoArgs>(
        'actionOne'
      );
      expect(getActionWithMultiPayload({ data: { one: 1, two: 2 } }, new Set(['hello']))).toEqual({
        type: 'actionOne',
        payload: [{ data: { one: 1, two: 2 } }, new Set(['hello'])],
      });
    });
  });
});
