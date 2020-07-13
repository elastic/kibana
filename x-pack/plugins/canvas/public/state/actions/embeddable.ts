/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import { createAction } from 'redux-actions';
import { createThunk } from '../../lib/create_thunk';
// @ts-expect-error untyped local
import { fetchRenderable } from './elements';
import { State } from '../../../types';

export const UpdateEmbeddableExpressionActionType = 'updateEmbeddableExpression';
export interface UpdateEmbeddableExpressionPayload {
  embeddableExpression: string;
  elementId: string;
}
export const updateEmbeddableExpression = createAction<UpdateEmbeddableExpressionPayload>(
  UpdateEmbeddableExpressionActionType
);

export const fetchEmbeddableRenderable = createThunk(
  'fetchEmbeddableRenderable',
  ({ dispatch, getState }: { dispatch: Dispatch; getState: () => State }, elementId: string) => {
    const pageWithElement = getState().persistent.workpad.pages.find((page) => {
      return page.elements.find((element) => element.id === elementId) !== undefined;
    });

    if (pageWithElement) {
      const element = pageWithElement.elements.find((el) => el.id === elementId);
      dispatch(fetchRenderable(element));
    }
  }
);
