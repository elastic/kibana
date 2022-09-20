/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionItemCard } from '.';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '@kbn/lists-plugin/common/schemas/types/comment.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

describe('ExceptionItemCard', () => {
  it('it renders header, item meta information and conditions', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: [] };

    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions={false}
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
          dataTestSubj="item"
        />
      </TestProviders>
    );

    expect(wrapper.find('ExceptionItemCardHeader')).toHaveLength(1);
    expect(wrapper.find('ExceptionItemCardMetaInfo')).toHaveLength(1);
    expect(wrapper.find('ExceptionItemCardConditions')).toHaveLength(1);
    expect(
      wrapper.find('[data-test-subj="exceptionsViewerCommentAccordion"]').exists()
    ).toBeFalsy();
  });

  it('it renders header, item meta information, conditions, and comments if any exist', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: getCommentsArrayMock() };

    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions={false}
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
        />
      </TestProviders>
    );

    expect(wrapper.find('ExceptionItemCardHeader')).toHaveLength(1);
    expect(wrapper.find('ExceptionItemCardMetaInfo')).toHaveLength(1);
    expect(wrapper.find('ExceptionItemCardConditions')).toHaveLength(1);
    expect(
      wrapper.find('[data-test-subj="exceptionsViewerCommentAccordion"]').exists()
    ).toBeTruthy();
  });

  it('it does not render edit or delete action buttons when "disableActions" is "true"', () => {
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
        />
      </TestProviders>
    );

    expect(wrapper.find('button[data-test-subj="item-actionButton"]').exists()).toBeFalsy();
  });

  it('it invokes "onEditException" when edit button clicked', () => {
    const mockOnEditException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions={false}
          onDeleteException={jest.fn()}
          onEditException={mockOnEditException}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
        />
      </TestProviders>
    );

    // click on popover
    wrapper
      .find('button[data-test-subj="exceptionItemCardHeader-actionButton"]')
      .at(0)
      .simulate('click');
    wrapper
      .find('button[data-test-subj="exceptionItemCardHeader-actionItem-edit"]')
      .simulate('click');

    expect(mockOnEditException).toHaveBeenCalledWith(getExceptionListItemSchemaMock());
  });

  it('it invokes "onDeleteException" when delete button clicked', () => {
    const mockOnDeleteException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions={false}
          onDeleteException={mockOnDeleteException}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
        />
      </TestProviders>
    );

    // click on popover
    wrapper
      .find('button[data-test-subj="exceptionItemCardHeader-actionButton"]')
      .at(0)
      .simulate('click');
    wrapper
      .find('button[data-test-subj="exceptionItemCardHeader-actionItem-delete"]')
      .simulate('click');

    expect(mockOnDeleteException).toHaveBeenCalledWith({
      id: '1',
      name: 'some name',
      namespaceType: 'single',
    });
  });

  it('it renders comment accordion closed to begin with', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCard
          disableActions={false}
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={[
            {
              exception_lists: [
                {
                  id: '123',
                  list_id: 'i_exist',
                  namespace_type: 'single',
                  type: 'detection',
                },
                {
                  id: '456',
                  list_id: 'i_exist_2',
                  namespace_type: 'single',
                  type: 'detection',
                },
              ],
              id: '1a2b3c',
              name: 'Simple Rule Query',
              rule_id: 'rule-2',
            },
          ]}
        />
      </TestProviders>
    );

    expect(wrapper.find('.euiAccordion-isOpen')).toHaveLength(0);
  });
});
