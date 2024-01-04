/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as rTLRender, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { Rule } from '../../../../rule_management/logic/types';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { useFindRules } from '../../../../rule_management/logic/use_find_rules';
import { useAddToRulesTable } from './use_add_to_rules_table';

jest.mock('../../../../rule_management/logic/use_find_rules');

const mockedRule = getRulesSchemaMock();
const onRuleSelectionChangeMock = jest.fn();
const initiallySelectedRules = [{ ...mockedRule, id: '345', name: 'My rule' }] as Rule[];

describe('useAddToRulesTable', () => {
  it('should call the useFindRules with the correct parameters', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [mockedRule],
        total: 0,
      },
      isFetched: true,
    });
    renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    expect(useFindRules as jest.Mock).toBeCalledWith({
      filterOptions: {
        filter: '',
        showCustomRules: false,
        showElasticRules: false,
        tags: [],
      },
      sortingOptions: undefined,
      pagination: {
        page: 1,
        perPage: 10000,
      },
    });
  });
  it('should return all stored rule if less than 10000 when calling the useFindRules', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: Array(30).fill(mockedRule),
        total: 0,
      },
      isFetched: true,
    });
    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    const { sortedRulesByLinkedRulesOnTop, isLoading } = current;
    expect(sortedRulesByLinkedRulesOnTop.length).toEqual(30);
    expect(isLoading).toBeFalsy();
  });
  it('should return isLoading true and pagination as default if useFindRules is fetching', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [],
        total: 0,
      },
      isFetched: false,
    });
    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    const {
      sortedRulesByLinkedRulesOnTop,
      isLoading,
      pagination,
      searchOptions,
      addToSelectedRulesDescription,
    } = current;
    expect(sortedRulesByLinkedRulesOnTop.length).toEqual(0);
    expect(isLoading).toBeTruthy();
    expect(pagination).toEqual({ pageIndex: 0, initialPageSize: 25, showPerPageOptions: false });
    expect(searchOptions.filters[0].name).toEqual('Tags');
    expect(addToSelectedRulesDescription).toEqual(
      'After you create the exception, it is added to the rules you link. '
    );
  });
  it('should sort initially selected rules on top', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [mockedRule, { ...mockedRule, id: '345', name: 'My rule' }],
        total: 0,
      },
      isFetched: true,
    });
    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    const { sortedRulesByLinkedRulesOnTop } = current;
    expect(sortedRulesByLinkedRulesOnTop[0]).toEqual(
      expect.objectContaining({ id: '345', name: 'My rule' })
    );
  });
  it('should filter out duplicated tags from tag options', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [
          { ...mockedRule, tags: ['some fake tag 1'] },
          { ...mockedRule, tags: ['some fake tag 1'], id: '345', name: 'My rule' },
        ],
        total: 0,
      },
      isFetched: true,
    });
    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    const { searchOptions } = current;
    const { filters } = searchOptions;
    const { options } = filters[0];
    expect(options).toEqual([
      {
        field: 'tags',
        name: 'some fake tag 1',
        value: 'some fake tag 1',
      },
    ]);
  });
  it('should call onRuleLinkChange when switch of a rule is clicked', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [
          mockedRule,
          { ...mockedRule, tags: ['some fake tag 1'], id: '345', name: 'My rule' },
        ],
        total: 0,
      },
      isFetched: true,
    });

    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );
    const { rulesTableColumnsWithLinkSwitch } = current;
    const { name, render } =
      rulesTableColumnsWithLinkSwitch[0] as EuiTableFieldDataColumnType<Rule>;
    expect(name).toEqual('Link');

    const LinkColumn = (render ? render(null, mockedRule as Rule) : <></>) as JSX.Element;
    const { getByRole } = rTLRender(<div>{LinkColumn}</div>);
    const selectedSwitch = getByRole('switch');
    fireEvent.click(selectedSwitch);

    expect(onRuleSelectionChangeMock).toBeCalledWith([
      expect.objectContaining({ id: '345', name: 'My rule' }),
    ]);
  });
  it('should change the pagination when onTableChange is called', () => {
    (useFindRules as jest.Mock).mockReturnValue({
      data: {
        rules: [
          mockedRule,
          { ...mockedRule, tags: ['some fake tag 1'], id: '345', name: 'My rule' },
        ],
        total: 0,
      },
      isFetched: true,
    });

    const {
      result: { current },
    } = renderHook(() =>
      useAddToRulesTable({
        initiallySelectedRules,
        onRuleSelectionChange: onRuleSelectionChangeMock,
      })
    );

    const { onTableChange, pagination } = current;
    act(() => {
      onTableChange({ page: { index: 2, size: 10 } });
    });
    waitFor(() =>
      expect(pagination).toEqual({
        initialPageSize: 5,
        pageIndex: 2,
        size: 10,
        showPerPageOptions: false,
      })
    );
  });
});
