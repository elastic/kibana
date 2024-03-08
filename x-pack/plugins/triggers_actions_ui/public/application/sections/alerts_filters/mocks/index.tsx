/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlGroupContainer } from '@kbn/controls-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { FC } from 'react';
import React, { useEffect } from 'react';
import { TEST_IDS } from '../constants';
import type { FilterGroupProps } from '../types';
import { getControlGroupMock } from './control_group';

/**
 *
 *  Retrieves a simple of FilterGroup Item.
 *   - Can also call callback onFilterChange with custom args
 *
 * @example
 * const onFilterchangeMock = jest.fn();
 * const onInitMock = jest.fn();
 *
 *const TestComponent = () => (
 *  <TestProviders>
 *    <FilterGroup
 *      chainingSystem="NONE"
 *      dataViewId=""
 *      initialControls={[]}
 *      onFilterChange={onFilterchangeMock}
 *      onInit={onInitMock}
 *    />
 *  </TestProviders>
 *);
 *
 *jest.mock('..');
 *
 *describe('Some test', () => {
 *  it('basic test', () => {
 *    (FilterGroup as jest.Mock).mockImplementationOnce(
 *      getMockedFilterGroupWithCustomFilters([
 *        {
 *          meta: {
 *            params: ['open'],
 *          },
 *        },
 *      ])
 *    );
 *
 *    render(<TestComponent />);
 *
 *    expect(onFilterchangeMock.mock.calls[0][0]).toMatchObject([
 *      {
 *        meta: {
 *          params: ['open'],
 *        },
 *      },
 *    ]);
 *  });
 *});
 *
 */
export function getMockedFilterGroupWithCustomFilters(outputFilters?: Filter[]) {
  const FilterGroup: FC<FilterGroupProps> = ({ onInit, onFilterChange }) => {
    useEffect(() => {
      if (onInit) {
        onInit(getControlGroupMock() as unknown as ControlGroupContainer);
      }

      if (onFilterChange) {
        onFilterChange(outputFilters ?? []);
      }
    }, [onInit, onFilterChange]);

    return <div data-test-subj={TEST_IDS.MOCKED_CONTROL} />;
  };

  return FilterGroup;
}
