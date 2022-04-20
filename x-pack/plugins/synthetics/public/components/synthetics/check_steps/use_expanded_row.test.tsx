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
          status: 'succeeded',
          duration: {
            us: 9999,
          },
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
          status: 'succeeded',
          duration: {
            us: 9999,
          },
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

  it('returns expected browser consoles', async () => {
    const { result } = renderHook(() =>
      useExpandedRow({
        steps: defaultSteps,
        allSteps: [...defaultSteps, browserConsoleStep],
        loading: false,
      })
    );

    result.current.toggleExpand({ journeyStep: defaultSteps[0] });

    expect(result.current.expandedRows[0].props.browserConsoles).toEqual([
      browserConsoleStep.synthetics.payload.text,
    ]);
  });

  describe('getExpandedStepCallback', () => {
    it('matches step index to key', () => {
      const callback = getExpandedStepCallback(2);
      expect(callback(defaultSteps[0])).toBe(false);
      expect(callback(defaultSteps[1])).toBe(true);
    });
  });
});

const browserConsoleStep = {
  _id: 'IvT1oXwB5ds00bB_FVXP',
  observer: {
    hostname: '16Elastic',
    geo: {
      name: 'au-heartbeat',
    },
  },
  agent: {
    name: '16Elastic',
    id: '77def92c-1a78-4353-b9e5-45d31920b1b7',
    type: 'heartbeat',
    ephemeral_id: '3a9ca86c-08d0-4f3f-b857-aeef540b3cac',
    version: '8.0.0',
  },
  '@timestamp': '2021-10-21T08:25:25.221Z',
  package: { name: '@elastic/synthetics', version: '1.0.0-beta.14' },
  ecs: { version: '1.12.0' },
  os: { platform: 'darwin' },
  synthetics: {
    package_version: '1.0.0-beta.14',
    journey: { name: 'inline', id: 'inline' },
    payload: {
      text: "Refused to execute inline script because it violates the following Content Security Policy directive: \"script-src 'unsafe-eval' 'self'\". Either the 'unsafe-inline' keyword, a hash ('sha256-P5polb1UreUSOe5V/Pv7tc+yeZuJXiOi/3fqhGsU7BE='), or a nonce ('nonce-...') is required to enable inline execution.\n",
      type: 'error',
    },
    index: 755,
    step: { duration: { us: 0 }, name: 'goto kibana', index: 1, status: '' },
    type: 'journey/browserconsole',
    isFullScreenshot: false,
    isScreenshotRef: true,
  },
  monitor: {
    name: 'cnn-monitor - inline',
    timespan: { lt: '2021-10-21T08:27:04.662Z', gte: '2021-10-21T08:26:04.662Z' },
    check_group: '70acec60-3248-11ec-9921-acde48001122',
    id: 'cnn-monitor-inline',
    type: 'browser',
    status: 'up',
  },
  event: { dataset: 'browser' },
  timestamp: '2021-10-21T08:25:25.221Z',
};
