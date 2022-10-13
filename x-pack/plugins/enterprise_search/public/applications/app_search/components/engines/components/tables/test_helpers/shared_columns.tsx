/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../../__mocks__/kea_logic';
import '../__mocks__/engines_logic.mock';

import { ShallowWrapper } from 'enzyme';

import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';

import { EnginesLogic } from '../../..';
import { rerender } from '../../../../../../test_helpers';

import * as engineLinkHelpers from '../engine_link_helpers';

export const runSharedColumnsTests = (
  wrapper: ShallowWrapper,
  tableContent: string,
  values: object = {}
) => {
  const getTable = () => wrapper.find(EuiBasicTable).dive();

  describe('name column', () => {
    it('renders', () => {
      expect(tableContent).toContain('test-engine');
    });

    // Link behavior is tested in engine_link_helpers.test.tsx
  });

  describe('created at column', () => {
    it('renders', () => {
      expect(tableContent).toContain('Created at');
      expect(tableContent).toContain('Jan 1, 1970');
    });
  });

  describe('document count column', () => {
    it('renders', () => {
      expect(tableContent).toContain('Document count');
      expect(tableContent).toContain('99,999');
    });
  });

  describe('field count column', () => {
    it('renders', () => {
      expect(tableContent).toContain('Field count');
      expect(tableContent).toContain('10');
    });
  });

  describe('actions column', () => {
    const getActions = () => getTable().find('ExpandedItemActions');
    const getActionItems = () => getActions().dive().find('DefaultItemAction');

    it('will hide the action buttons if the user cannot manage/delete engines', () => {
      setMockValues({
        ...values,
        myRole: { canManageEngines: false, canManageMetaEngines: false },
      });
      rerender(wrapper);
      expect(getActions()).toHaveLength(0);
    });

    describe('when the user can manage/delete engines', () => {
      const getManageAction = () => getActionItems().at(0).dive().find(EuiButtonIcon);
      const getDeleteAction = () => getActionItems().at(1).dive().find(EuiButtonIcon);

      beforeAll(() => {
        setMockValues({
          ...values,
          myRole: { canManageEngines: true, canManageMetaEngines: true },
        });
        rerender(wrapper);
      });

      describe('manage action', () => {
        it('sends the user to the engine overview on click', () => {
          jest.spyOn(engineLinkHelpers, 'navigateToEngine');
          const { navigateToEngine } = engineLinkHelpers;
          getManageAction().simulate('click');

          expect(navigateToEngine).toHaveBeenCalledWith('test-engine');
        });
      });

      describe('delete action', () => {
        const { deleteEngine } = EnginesLogic.actions;

        it('clicking the action and confirming deletes the engine', () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(true);
          getDeleteAction().simulate('click');

          expect(deleteEngine).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'test-engine' })
          );
        });

        it('clicking the action and not confirming does not delete the engine', () => {
          jest.spyOn(global, 'confirm').mockReturnValueOnce(false);
          getDeleteAction().simulate('click');

          expect(deleteEngine).not.toHaveBeenCalled();
        });
      });
    });
  });
};
