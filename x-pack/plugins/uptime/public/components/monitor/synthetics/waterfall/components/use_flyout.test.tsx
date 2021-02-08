/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFlyout } from './use_flyout';
import { IWaterfallContext } from '../context/waterfall_chart';

import { ProjectedValues, XYChartElementEvent } from '@elastic/charts';

describe('useFlyoutHook', () => {
  const metadata: IWaterfallContext['metadata'] = [
    {
      x: 0,
      url: 'http://elastic.co',
      requestHeaders: undefined,
      responseHeaders: undefined,
      certificates: undefined,
      details: [
        {
          name: 'Content type',
          value: 'text/html',
        },
      ],
    },
  ];

  it('sets isFlyoutVisible to true and sets flyoutData when calling onSidebarClick', () => {
    const index = 0;
    const { result } = renderHook((props) => useFlyout(props.metadata), {
      initialProps: { metadata },
    });

    expect(result.current.isFlyoutVisible).toBe(false);

    act(() => {
      result.current.onSidebarClick({ buttonRef: { current: null }, networkItemIndex: index });
    });

    expect(result.current.isFlyoutVisible).toBe(true);
    expect(result.current.flyoutData).toEqual(metadata[index]);
  });

  it('sets isFlyoutVisible to true and sets flyoutData when calling onBarClick', () => {
    const index = 0;
    const elementData = [
      {
        datum: {
          config: {
            id: index,
          },
        },
      },
      {},
    ];

    const { result } = renderHook((props) => useFlyout(props.metadata), {
      initialProps: { metadata },
    });

    expect(result.current.isFlyoutVisible).toBe(false);

    act(() => {
      result.current.onBarClick([elementData as XYChartElementEvent]);
    });

    expect(result.current.isFlyoutVisible).toBe(true);
    expect(result.current.flyoutData).toEqual(metadata[0]);
  });

  it('sets isFlyoutVisible to true and sets flyoutData when calling onProjectionClick', () => {
    const index = 0;
    const geometry = { x: index };

    const { result } = renderHook((props) => useFlyout(props.metadata), {
      initialProps: { metadata },
    });

    expect(result.current.isFlyoutVisible).toBe(false);

    act(() => {
      result.current.onProjectionClick(geometry as ProjectedValues);
    });

    expect(result.current.isFlyoutVisible).toBe(true);
    expect(result.current.flyoutData).toEqual(metadata[0]);
  });
});
