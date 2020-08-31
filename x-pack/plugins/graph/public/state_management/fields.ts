/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory, { Action } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { createSelector } from 'reselect';
import { select, takeLatest, takeEvery } from 'redux-saga/effects';
import { WorkspaceField } from '../types';
import { GraphState, GraphStoreDependencies } from './store';
import { reset } from './global';
import { setDatasource } from './datasource';
import { matchesOne, InferActionType } from './helpers';

const actionCreator = actionCreatorFactory('x-pack/graph/fields');

export const loadFields = actionCreator<WorkspaceField[]>('LOAD_FIELDS');
export const updateFieldProperties = actionCreator<{
  fieldName: string;
  fieldProperties: Partial<Pick<WorkspaceField, 'hopSize' | 'lastValidHopSize' | 'color' | 'icon'>>;
}>('UPDATE_FIELD_PROPERTIES');
export const selectField = actionCreator<string>('SELECT_FIELD');
export const deselectField = actionCreator<string>('DESELECT_FIELD');

export type FieldsState = Record<string, WorkspaceField>;

const initialFields: FieldsState = {};

export const fieldsReducer = reducerWithInitialState(initialFields)
  .case(reset, () => initialFields)
  .case(setDatasource, () => initialFields)
  .case(loadFields, (_currentFields, newFields) => {
    const newFieldMap: Record<string, WorkspaceField> = {};
    newFields.forEach((field) => {
      newFieldMap[field.name] = field;
    });

    return newFieldMap;
  })
  .case(updateFieldProperties, (fields, { fieldName, fieldProperties }) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], ...fieldProperties } };
  })
  .case(selectField, (fields, fieldName) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], selected: true } };
  })
  .case(deselectField, (fields, fieldName) => {
    return { ...fields, [fieldName]: { ...fields[fieldName], selected: false } };
  })
  .build();

export const fieldMapSelector = (state: GraphState) => state.fields;
export const fieldsSelector = createSelector(fieldMapSelector, (fields) => Object.values(fields));
export const selectedFieldsSelector = createSelector(fieldsSelector, (fields) =>
  fields.filter((field) => field.selected)
);
export const liveResponseFieldsSelector = createSelector(selectedFieldsSelector, (fields) =>
  fields.filter((field) => field.hopSize && field.hopSize > 0)
);
export const hasFieldsSelector = createSelector(
  selectedFieldsSelector,
  (fields) => fields.length > 0
);

/**
 * Saga making notifying angular when fields are selected to re-calculate the state of the save button.
 *
 * Won't be necessary once the workspace is moved to redux
 */
export const updateSaveButtonSaga = ({ notifyAngular }: GraphStoreDependencies) => {
  function* notify(): IterableIterator<void> {
    notifyAngular();
  }
  return function* () {
    yield takeLatest(matchesOne(selectField, deselectField), notify);
  };
};

/**
 * Saga making sure the fields in the store are always synced with the fields
 * known to the workspace.
 *
 * Won't be necessary once the workspace is moved to redux
 */
export const syncFieldsSaga = ({ getWorkspace, setLiveResponseFields }: GraphStoreDependencies) => {
  function* syncFields() {
    const workspace = getWorkspace();
    if (!workspace) {
      return;
    }

    const currentState = yield select();
    workspace.options.vertex_fields = selectedFieldsSelector(currentState);
    setLiveResponseFields(liveResponseFieldsSelector(currentState));
  }
  return function* () {
    yield takeEvery(
      matchesOne(loadFields, selectField, deselectField, updateFieldProperties),
      syncFields
    );
  };
};

/**
 * Saga making sure the field styles (icons and colors) are applied to nodes currently active
 * in the workspace.
 *
 * Won't be necessary once the workspace is moved to redux
 */
export const syncNodeStyleSaga = ({ getWorkspace, notifyAngular }: GraphStoreDependencies) => {
  function* syncNodeStyle(action: Action<InferActionType<typeof updateFieldProperties>>) {
    const workspace = getWorkspace();
    if (!workspace) {
      return;
    }
    const newColor = action.payload.fieldProperties.color;
    if (newColor) {
      workspace.nodes.forEach(function (node) {
        if (node.data.field === action.payload.fieldName) {
          node.color = newColor;
        }
      });
    }
    const newIcon = action.payload.fieldProperties.icon;

    if (newIcon) {
      workspace.nodes.forEach(function (node) {
        if (node.data.field === action.payload.fieldName) {
          node.icon = newIcon;
        }
      });
    }
    notifyAngular();

    const selectedFields = selectedFieldsSelector(yield select());
    workspace.options.vertex_fields = selectedFields;
  }

  return function* () {
    yield takeLatest(updateFieldProperties.match, syncNodeStyle);
  };
};
