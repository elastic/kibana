/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsManagementRecord } from '../../../../../src/plugins/saved_objects_management/public';
import { uiApiMock } from '../ui_api/mocks';
import { ShareToSpaceSavedObjectsManagementAction } from './share_saved_objects_to_space_action';

describe('ShareToSpaceSavedObjectsManagementAction', () => {
  const createAction = () => {
    const spacesApiUi = uiApiMock.create();
    return new ShareToSpaceSavedObjectsManagementAction(spacesApiUi);
  };
  describe('#euiAction.available', () => {
    describe('with an object type that has a namespaceType of "multiple"', () => {
      const object = { meta: { namespaceType: 'multiple' } } as SavedObjectsManagementRecord;

      it(`is available when UI capabilities are not set`, () => {
        const action = createAction();
        expect(action.euiAction.available(object)).toBe(true);
      });

      it(`is available when UI capabilities are set and shareIntoSpace is enabled`, () => {
        const action = createAction();
        const capabilities: any = { savedObjectsManagement: { shareIntoSpace: true } };
        action.setActionContext({ capabilities });
        expect(action.euiAction.available(object)).toBe(true);
      });

      it(`is not available when UI capabilities are set and shareIntoSpace is disabled`, () => {
        const action = createAction();
        const capabilities: any = { savedObjectsManagement: { shareIntoSpace: false } };
        action.setActionContext({ capabilities });
        expect(action.euiAction.available(object)).toBe(false);
      });
    });

    describe('with an object type that does not have a namespaceType of "multiple"', () => {
      const object = { meta: { namespaceType: 'single' } } as SavedObjectsManagementRecord;

      it(`is not available when UI capabilities are not set`, () => {
        const action = createAction();
        expect(action.euiAction.available(object)).toBe(false);
      });

      it(`is not available when UI capabilities are set and shareIntoSpace is enabled`, () => {
        const action = createAction();
        const capabilities: any = { savedObjectsManagement: { shareIntoSpace: true } };
        action.setActionContext({ capabilities });
        expect(action.euiAction.available(object)).toBe(false);
      });

      it(`is not available when UI capabilities are set and shareIntoSpace is disabled`, () => {
        const action = createAction();
        const capabilities: any = { savedObjectsManagement: { shareIntoSpace: false } };
        action.setActionContext({ capabilities });
        expect(action.euiAction.available(object)).toBe(false);
      });
    });
  });
});
