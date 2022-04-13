/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findTestSubject } from '@elastic/eui/lib/test';
import { skip, take } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { mount } from 'enzyme';
import { TimeRangeEmbeddable, TimeRangeContainer, TIME_RANGE_EMBEDDABLE } from './test_helpers';
import { CustomTimeRangeBadge } from './custom_time_range_badge';
import { ReactElement } from 'react';
import { nextTick } from '@kbn/test-jest-helpers';

test('Removing custom time range from badge resets embeddable back to container time', async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
            timeRange: { from: '1', to: '2' },
          },
        },
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  const child2 = container.getChild<TimeRangeEmbeddable>('2');

  const openModalMock = jest.fn();
  openModalMock.mockReturnValue({ close: jest.fn() });

  new CustomTimeRangeBadge({
    openModal: openModalMock,
    dateFormat: 'MM YYYY',
    commonlyUsedRanges: [],
  }).execute({
    embeddable: child1,
  });

  await nextTick();
  const openModal = openModalMock.mock.calls[0][0] as ReactElement;

  const wrapper = mount(openModal);
  findTestSubject(wrapper, 'removePerPanelTimeRangeButton').simulate('click');

  const promise = Rx.merge(child1.getInput$(), container.getOutput$(), container.getInput$())
    .pipe(skip(4), take(1))
    .toPromise();

  container.updateInput({ timeRange: { from: 'now-10m', to: 'now-5m' } });

  await promise;

  expect(child1.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
  expect(child2.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
});

test(`badge is not compatible with embeddable that inherits from parent`, async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const openModalMock = jest.fn();
  const compatible = await new CustomTimeRangeBadge({
    openModal: openModalMock,
    dateFormat: 'MM YYYY',
    commonlyUsedRanges: [],
  }).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(false);
});

test(`badge is compatible with embeddable that has custom time range`, async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
            timeRange: { to: '123', from: '456' },
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const openModalMock = jest.fn();
  const compatible = await new CustomTimeRangeBadge({
    openModal: openModalMock,
    dateFormat: 'MM YYYY',
    commonlyUsedRanges: [],
  }).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(true);
});

test('Attempting to execute on incompatible embeddable throws an error', async () => {
  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    () => undefined
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const openModalMock = jest.fn();
  const badge = await new CustomTimeRangeBadge({
    openModal: openModalMock,
    dateFormat: 'MM YYYY',
    commonlyUsedRanges: [],
  });

  async function check() {
    await badge.execute({ embeddable: child });
  }
  await expect(check()).rejects.toThrow(Error);
});
