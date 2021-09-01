/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactRouterDom, { Route } from 'react-router-dom';
import { fireEvent, screen } from '@testing-library/dom';
import { renderHook, act as hooksAct } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import { EuiButtonIcon } from '@elastic/eui';
import { getExpandedStepCallback, useExpandedRow } from './use_expanded_row';
import { render } from '../../../lib/helper/rtl_helpers';
import { JourneyStep } from '../../../../common/runtime_types';
import { SYNTHETIC_CHECK_STEPS_ROUTE } from '../../../../common/constants';
import { COLLAPSE_LABEL, EXPAND_LABEL } from '../translations';
import { act } from 'react-dom/test-utils';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

describe('useExpandedROw', () => {
  let expandedRowsObj = {};
  const checkGroup = 'fake-group';
  const TEST_ID = 'uptimeStepListExpandBtn';

  const history = createMemoryHistory({
    initialEntries: [`/journey/${checkGroup}/steps`],
  });
  const defaultSteps: JourneyStep[] = [
    {
      _id: '1',
      '@timestamp': '123',
      monitor: {
        id: 'MON_ID',
        duration: {
          us: 10,
        },
        status: 'down',
        check_group: 'fake-group',
      },
      synthetics: {
        payload: {
          status: 'failed',
        },
        type: 'step/end',
        step: {
          name: 'load page',
          index: 1,
        },
      },
    },
    {
      _id: '2',
      '@timestamp': '124',
      monitor: {
        id: 'MON_ID',
        duration: {
          us: 10,
        },
        status: 'down',
        check_group: 'fake-group',
      },
      synthetics: {
        payload: {
          status: 'failed',
        },
        type: 'step/end',
        step: {
          name: 'go to login',
          index: 2,
        },
      },
    },
  ];

  const Component = () => {
    const { expandedRows, toggleExpand } = useExpandedRow({
      steps: defaultSteps,
      allSteps: defaultSteps,
      loading: false,
    });

    expandedRowsObj = expandedRows;

    return (
      <Route path={SYNTHETIC_CHECK_STEPS_ROUTE}>
        Step list
        {defaultSteps.map((journeyStep, index) => (
          <EuiButtonIcon
            key={index}
            data-test-subj={TEST_ID + index}
            onClick={() => toggleExpand({ journeyStep })}
            aria-label={expandedRows[journeyStep._id] ? COLLAPSE_LABEL : EXPAND_LABEL}
            iconType={expandedRows[journeyStep._id] ? 'arrowUp' : 'arrowDown'}
          />
        ))}
      </Route>
    );
  };

  it('it toggles rows on expand click', async () => {
    render(<Component />, {
      history,
    });

    fireEvent.click(await screen.findByTestId(TEST_ID + '1'));

    expect(Object.keys(expandedRowsObj)).toStrictEqual(['1']);

    expect(JSON.stringify(expandedRowsObj)).toContain('fake-group');

    await act(async () => {
      fireEvent.click(await screen.findByTestId(TEST_ID + '1'));
    });

    expect(Object.keys(expandedRowsObj)).toStrictEqual([]);
  });

  beforeEach(() => {
    jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({ checkGroupId: checkGroup });
  });

  it('it can expand both rows at same time', async () => {
    render(<Component />, {
      history,
    });

    // let's expand both rows
    fireEvent.click(await screen.findByTestId(TEST_ID + '1'));
    fireEvent.click(await screen.findByTestId(TEST_ID + '0'));

    expect(Object.keys(expandedRowsObj)).toStrictEqual(['0', '1']);
  });

  it('it updates already expanded rows on new check group monitor', async () => {
    render(<Component />, {
      history,
    });

    // let's expand both rows
    fireEvent.click(await screen.findByTestId(TEST_ID + '1'));
    fireEvent.click(await screen.findByTestId(TEST_ID + '0'));

    const newFakeGroup = 'new-fake-group-1';

    defaultSteps[0].monitor.check_group = newFakeGroup;
    defaultSteps[1].monitor.check_group = newFakeGroup;

    act(() => {
      history.push(`/journey/${newFakeGroup}/steps`);
    });

    expect(JSON.stringify(expandedRowsObj)).toContain(newFakeGroup);
  });

  it('handles unequal amount of steps when navigating to new check group', async () => {
    const { result, rerender } = renderHook(
      ({
        steps,
        allSteps,
        loading,
      }: {
        steps: JourneyStep[];
        allSteps: JourneyStep[];
        loading: boolean;
      }) =>
        useExpandedRow({
          steps,
          allSteps,
          loading,
        }),
      { initialProps: { steps: defaultSteps, allSteps: defaultSteps, loading: false } }
    );

    // check group, with two steps
    // let's expand both rows
    hooksAct(() => {
      result.current.toggleExpand({ journeyStep: defaultSteps[0] });
    });
    hooksAct(() => {
      result.current.toggleExpand({ journeyStep: defaultSteps[1] });
    });

    // expect two open rows
    expect(Object.keys(result.current.expandedRows)).toEqual(['0', '1']);

    // change checkGroupId to ensure that useEffect runs
    jest.spyOn(ReactRouterDom, 'useParams').mockReturnValue({ checkGroupId: 'new-fake-group' });

    // rerender with new check group, with one step
    rerender({ steps: [defaultSteps[0]], allSteps: [defaultSteps[0]], loading: false });

    // expect only one accordion to be expanded
    expect(Object.keys(result.current.expandedRows)).toEqual(['0']);
  });

  describe('getExpandedStepCallback', () => {
    it('matches step index to key', () => {
      const callback = getExpandedStepCallback(2);
      expect(callback(defaultSteps[0])).toBe(false);
      expect(callback(defaultSteps[1])).toBe(true);
    });
  });
});
