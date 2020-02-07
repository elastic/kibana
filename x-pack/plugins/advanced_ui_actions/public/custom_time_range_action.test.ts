/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { skip } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { mount } from 'enzyme';

import { EmbeddableFactory } from '../../../../src/plugins/embeddable/public';
import { TimeRangeEmbeddable, TimeRangeContainer, TIME_RANGE_EMBEDDABLE } from './test_helpers';
import { TimeRangeEmbeddableFactory } from './test_helpers/time_range_embeddable_factory';
import { CustomTimeRangeAction } from './custom_time_range_action';
/* eslint-disable */
import {
  HelloWorldContainer,
} from '../../../../src/plugins/embeddable/public/lib/test_samples';
/* eslint-enable */

import {
  HelloWorldEmbeddableFactory,
  HelloWorldEmbeddable,
  HELLO_WORLD_EMBEDDABLE,
} from '../../../../examples/embeddable_examples/public';

import { nextTick } from 'test_utils/enzyme_helpers';
import { ReactElement } from 'react';

jest.mock('ui/new_platform');

const createOpenModalMock = () => {
  const mock = jest.fn();
  mock.mockReturnValue({ close: jest.fn() });
  return mock;
};

test('Custom time range action prevents embeddable from using container time', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

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
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    (() => {}) as any
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  expect(child1).toBeDefined();
  expect(child1.getInput().timeRange).toEqual({ from: 'now-15m', to: 'now' });

  const child2 = container.getChild<TimeRangeEmbeddable>('2');
  expect(child2).toBeDefined();
  expect(child2.getInput().timeRange).toEqual({ from: 'now-15m', to: 'now' });

  const openModalMock = createOpenModalMock();

  new CustomTimeRangeAction({
    openModal: openModalMock,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  await nextTick();
  const openModal = openModalMock.mock.calls[0][0] as ReactElement;

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-30days', to: 'now-29days' } });

  findTestSubject(wrapper, 'addPerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: 'now-30days', to: 'now-29days' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-30m', to: 'now-1m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });
});

test('Removing custom time range action resets embeddable back to container time', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

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
        '2': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '2',
          },
        },
      },
      id: '123',
    },
    (() => {}) as any
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  const child2 = container.getChild<TimeRangeEmbeddable>('2');

  const openModalMock = createOpenModalMock();
  new CustomTimeRangeAction({
    openModal: openModalMock,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  await nextTick();
  const openModal = openModalMock.mock.calls[0][0] as ReactElement;

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-30days', to: 'now-29days' } });

  findTestSubject(wrapper, 'addPerPanelTimeRangeButton').simulate('click');

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });

  new CustomTimeRangeAction({
    openModal: openModalMock,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  await nextTick();
  const openModal2 = openModalMock.mock.calls[1][0];

  const wrapper2 = mount(openModal2);
  findTestSubject(wrapper2, 'removePerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-10m', to: 'now-5m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-10m', to: 'now-5m' } });
});

test('Cancelling custom time range action leaves state alone', async done => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());

  const container = new TimeRangeContainer(
    {
      timeRange: { from: 'now-15m', to: 'now' },
      panels: {
        '1': {
          type: TIME_RANGE_EMBEDDABLE,
          explicitInput: {
            id: '1',
            timeRange: { to: '2', from: '1' },
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
    (() => {}) as any
  );

  await container.untilEmbeddableLoaded('1');
  await container.untilEmbeddableLoaded('2');

  const child1 = container.getChild<TimeRangeEmbeddable>('1');
  const child2 = container.getChild<TimeRangeEmbeddable>('2');

  const openModalMock = createOpenModalMock();
  new CustomTimeRangeAction({
    openModal: openModalMock,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).execute({
    embeddable: child1,
  });

  await nextTick();
  const openModal = openModalMock.mock.calls[0][0] as ReactElement;

  const wrapper = mount(openModal);
  wrapper.setState({ timeRange: { from: 'now-300m', to: 'now-400m' } });

  findTestSubject(wrapper, 'cancelPerPanelTimeRangeButton').simulate('click');

  const subscription = Rx.merge(container.getOutput$(), container.getInput$())
    .pipe(skip(2))
    .subscribe(() => {
      expect(child1.getInput().timeRange).toEqual({ from: '1', to: '2' });
      expect(child2.getInput().timeRange).toEqual({ from: 'now-30m', to: 'now-1m' });
      subscription.unsubscribe();
      done();
    });

  container.updateInput({ timeRange: { from: 'now-30m', to: 'now-1m' } });
});

test(`badge is compatible with embeddable that inherits from parent`, async () => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(TIME_RANGE_EMBEDDABLE, new TimeRangeEmbeddableFactory());
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
    (() => {}) as any
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<TimeRangeEmbeddable>('1');

  const openModalMock = createOpenModalMock();
  const compatible = await new CustomTimeRangeAction({
    openModal: openModalMock,
    commonlyUsedRanges: [],
    dateFormat: 'MM YYY',
  }).isCompatible({
    embeddable: child,
  });
  expect(compatible).toBe(true);
});

// TODO: uncomment when https://github.com/elastic/kibana/issues/43271 is fixed.
// test('Embeddable that does not use time range in a container that has time range is incompatible', async () => {
//   const embeddableFactories = new Map<string, EmbeddableFactory>();
//   embeddableFactories.set(HELLO_WORLD_EMBEDDABLE, new HelloWorldEmbeddableFactory());
// const container = new TimeRangeContainer(
//   {
//     timeRange: { from: 'now-15m', to: 'now' },
//     panels: {
//       '1': {
//         type: HELLO_WORLD_EMBEDDABLE,
//         explicitInput: {
//           id: '1',
//         },
//       },
//     },
//     id: '123',
//   },
//   (() => null) as any
// );

//   await container.untilEmbeddableLoaded('1');

//   const child = container.getChild<HelloWorldEmbeddable>('1');

//   const start = coreMock.createStart();
//   const action = await new CustomTimeRangeAction({
//     openModal: start.overlays.openModal,
//     dateFormat: 'MM YYYY',
//     commonlyUsedRanges: [],
//   });

//   async function check() {
//     await action.execute({ embeddable: child });
//   }
//   await expect(check()).rejects.toThrow(Error);
// });

test('Attempting to execute on incompatible embeddable throws an error', async () => {
  const embeddableFactories = new Map<string, EmbeddableFactory>();
  embeddableFactories.set(HELLO_WORLD_EMBEDDABLE, new HelloWorldEmbeddableFactory());
  const container = new HelloWorldContainer(
    {
      panels: {
        '1': {
          type: HELLO_WORLD_EMBEDDABLE,
          explicitInput: {
            id: '1',
          },
        },
      },
      id: '123',
    },
    (() => null) as any
  );

  await container.untilEmbeddableLoaded('1');

  const child = container.getChild<HelloWorldEmbeddable>('1');

  const openModalMock = createOpenModalMock();
  const action = await new CustomTimeRangeAction({
    openModal: openModalMock,
    dateFormat: 'MM YYYY',
    commonlyUsedRanges: [],
  });

  async function check() {
    // @ts-ignore
    await action.execute({ embeddable: child });
  }
  await expect(check()).rejects.toThrow(Error);
});
