/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { fireEvent, screen } from '@testing-library/dom';
import { EuiButtonIcon } from '@elastic/eui';
import { createMemoryHistory } from 'history';

import { useExpandedRow } from './use_expanded_row';
import { render } from '../../../lib/helper/rtl_helpers';
import { JourneyStep } from '../../../../common/runtime_types';
import { SYNTHETIC_CHECK_STEPS_ROUTE } from '../../../../common/constants';
import { COLLAPSE_LABEL, EXPAND_LABEL } from '../translations';
import { act } from 'react-dom/test-utils';

describe('useExpandedROw', () => {
  let expandedRowsObj = {};
  const TEST_ID = 'uptimeStepListExpandBtn';

  const history = createMemoryHistory({
    initialEntries: ['/journey/fake-group/steps'],
  });
  const steps: JourneyStep[] = [
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
      steps,
      allSteps: steps,
      loading: false,
    });

    expandedRowsObj = expandedRows;

    return (
      <Route path={SYNTHETIC_CHECK_STEPS_ROUTE}>
        Step list
        {steps.map((journeyStep, index) => (
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

    steps[0].monitor.check_group = newFakeGroup;
    steps[1].monitor.check_group = newFakeGroup;

    act(() => {
      history.push(`/journey/${newFakeGroup}/steps`);
    });

    expect(JSON.stringify(expandedRowsObj)).toContain(newFakeGroup);
  });
});
