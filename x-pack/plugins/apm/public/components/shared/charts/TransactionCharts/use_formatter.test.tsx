/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { TimeSeries } from '../../../../../typings/timeseries';
import { toMicroseconds } from '../../../../utils/formatters';
import { useFormatter } from './use_formatter';
import { render, fireEvent, act } from '@testing-library/react';

function MockComponent({
  timeSeries,
  disabledSeries,
  value,
}: {
  timeSeries: TimeSeries[];
  disabledSeries: boolean[];
  value: number;
}) {
  const { formatter, setDisabledSeriesState } = useFormatter(timeSeries);

  const onDisableSeries = () => {
    setDisabledSeriesState(disabledSeries);
  };

  return (
    <div>
      <button onClick={onDisableSeries}>disable series</button>
      {formatter(value).formatted}
    </div>
  );
}

describe('useFormatter', () => {
  const timeSeries = ([
    {
      data: [
        { x: 1, y: toMicroseconds(11, 'minutes') },
        { x: 2, y: toMicroseconds(1, 'minutes') },
        { x: 3, y: toMicroseconds(60, 'seconds') },
      ],
    },
    {
      data: [
        { x: 1, y: toMicroseconds(120, 'seconds') },
        { x: 2, y: toMicroseconds(1, 'minutes') },
        { x: 3, y: toMicroseconds(60, 'seconds') },
      ],
    },
    {
      data: [
        { x: 1, y: toMicroseconds(60, 'seconds') },
        { x: 2, y: toMicroseconds(5, 'minutes') },
        { x: 3, y: toMicroseconds(100, 'seconds') },
      ],
    },
  ] as unknown) as TimeSeries[];
  it('returns new formatter when disabled series state changes', () => {
    const { getByText } = render(
      <MockComponent
        timeSeries={timeSeries}
        value={toMicroseconds(120, 'seconds')}
        disabledSeries={[true, true, false]}
      />
    );
    expect(getByText('2.0 min')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('disable series'));
    });
    expect(getByText('120 s')).toBeInTheDocument();
  });
  it('falls back to the first formatter when disabled series is empty', () => {
    const { getByText } = render(
      <MockComponent
        timeSeries={timeSeries}
        value={toMicroseconds(120, 'seconds')}
        disabledSeries={[]}
      />
    );
    expect(getByText('2.0 min')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('disable series'));
    });
    expect(getByText('2.0 min')).toBeInTheDocument();
    // const { formatter, setDisabledSeriesState } = useFormatter(timeSeries);
    // expect(formatter(toMicroseconds(120, 'seconds'))).toEqual('2.0 min');
    // setDisabledSeriesState([true, true, false]);
    // expect(formatter(toMicroseconds(120, 'seconds'))).toEqual('2.0 min');
  });
  it('falls back to the first formatter when disabled series is all true', () => {
    const { getByText } = render(
      <MockComponent
        timeSeries={timeSeries}
        value={toMicroseconds(120, 'seconds')}
        disabledSeries={[true, true, true]}
      />
    );
    expect(getByText('2.0 min')).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText('disable series'));
    });
    expect(getByText('2.0 min')).toBeInTheDocument();
    // const { formatter, setDisabledSeriesState } = useFormatter(timeSeries);
    // expect(formatter(toMicroseconds(120, 'seconds'))).toEqual('2.0 min');
    // setDisabledSeriesState([true, true, false]);
    // expect(formatter(toMicroseconds(120, 'seconds'))).toEqual('2.0 min');
  });
});
