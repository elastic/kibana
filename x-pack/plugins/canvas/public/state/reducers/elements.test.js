/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elementsReducer } from './elements';
import { actionCreator } from './__fixtures__/action_creator';

describe('elements reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      id: 'workpad-1',
      pages: [
        {
          id: 'page-1',
          elements: [
            {
              id: 'element-0',
              expression: '',
            },
            {
              id: 'element-1',
              expression: 'demodata',
            },
          ],
        },
      ],
    };
  });

  it('expressionActions update element expression by id', () => {
    const expression = 'test expression';
    const expected = {
      id: 'element-1',
      expression,
    };
    const action = actionCreator('setExpression')({
      expression,
      elementId: 'element-1',
      pageId: 'page-1',
    });

    const newState = elementsReducer(state, action);
    const newElement = newState?.pages?.[0]?.elements?.[1];

    expect(newElement).toEqual(expected);
  });
});
