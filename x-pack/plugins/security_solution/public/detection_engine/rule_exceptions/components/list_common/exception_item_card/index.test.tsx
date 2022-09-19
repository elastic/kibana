/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { ExceptionItemCard } from '.';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getCommentsArrayMock } from '@kbn/lists-plugin/common/schemas/types/comment.mock';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { TestProviders } from '../../../../../common/mock';
import type { RuleReferenceSchema } from '../types';

jest.mock('../../../../../common/lib/kibana');

const ruleReferences: RuleReferenceSchema[] = [
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
];
describe('ExceptionItemCard', () => {
  it('it renders header, item meta information and conditions', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: [] };

    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          exceptionItem={exceptionItem}
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          dataTestSubj="item"
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.getByTestId('exceptionItemCardHeader')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    expect(wrapper.queryByTestId('exceptionsViewerCommentAccordion')).not.toBeInTheDocument();
  });

  it('it renders header, item meta information, conditions, and comments if any exist', () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), comments: getCommentsArrayMock() };

    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.getByTestId('exceptionItemCardHeader')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardMetaInfo')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionItemCardConditions')).toBeInTheDocument();
    expect(wrapper.getByTestId('exceptionsViewerCommentAccordion')).toBeInTheDocument();
  });

  it('it does not render edit or delete action buttons when "disableActions" is "true"', () => {
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          disableActions={true}
          onDeleteException={jest.fn()}
          onEditException={jest.fn()}
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
        />
      </TestProviders>
    );
    expect(wrapper.queryByTestId('item-actionButton')).not.toBeInTheDocument();
  });

  it('it invokes "onEditException" when edit button clicked', () => {
    const mockOnEditException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          exceptionItem={exceptionItem}
          dataTestSubj="exceptionItemCardHeader"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          onDeleteException={jest.fn()}
          onEditException={mockOnEditException}
        />
      </TestProviders>
    );

    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeader-actionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeader-actionItem-edit'));
    expect(mockOnEditException).toHaveBeenCalledWith(getExceptionListItemSchemaMock());
  });

  it('it invokes "onDeleteException" when delete button clicked', () => {
    const mockOnDeleteException = jest.fn();
    const exceptionItem = getExceptionListItemSchemaMock();

    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          exceptionItem={exceptionItem}
          dataTestSubj="exceptionItemCardHeader"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          onEditException={jest.fn()}
          onDeleteException={mockOnDeleteException}
        />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeader-actionButton'));
    fireEvent.click(wrapper.getByTestId('exceptionItemCardHeader-actionItem-delete'));

    expect(mockOnDeleteException).toHaveBeenCalledWith({
      id: '1',
      name: 'some name',
      namespaceType: 'single',
    });
  });

  it('it renders comment accordion closed to begin with', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.comments = getCommentsArrayMock();
    const wrapper = render(
      <TestProviders>
        <ExceptionItemCard
          exceptionItem={exceptionItem}
          dataTestSubj="item"
          listType={ExceptionListTypeEnum.DETECTION}
          ruleReferences={ruleReferences}
          onEditException={jest.fn()}
          onDeleteException={jest.fn()}
        />
      </TestProviders>
    );

    expect(wrapper.queryByTestId('accordion-comment-list')).not.toBeVisible();
  });
});
