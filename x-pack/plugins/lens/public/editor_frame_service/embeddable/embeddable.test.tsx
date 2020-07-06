/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { Embeddable } from './embeddable';
import { ReactExpressionRendererProps } from 'src/plugins/expressions/public';
import { Query, TimeRange, Filter, TimefilterContract } from 'src/plugins/data/public';
import { Document } from '../../persistence';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/plugins/visualizations/public/embeddable';

jest.mock('../../../../../../src/plugins/inspector/public/', () => ({
  isAvailable: false,
  open: false,
}));

const savedVis: Document = {
  expression: 'my | expression',
  state: {
    visualization: {},
    datasourceStates: {},
    datasourceMetaData: {
      filterableIndexPatterns: [],
    },
    query: { query: '', language: 'lucene' },
    filters: [],
  },
  title: 'My title',
  visualizationType: '',
};

describe('embeddable', () => {
  let mountpoint: HTMLDivElement;
  let expressionRenderer: jest.Mock<null, [ReactExpressionRendererProps]>;
  let getTrigger: jest.Mock;
  let trigger: { exec: jest.Mock };

  beforeEach(() => {
    mountpoint = document.createElement('div');
    expressionRenderer = jest.fn((_props) => null);
    trigger = { exec: jest.fn() };
    getTrigger = jest.fn(() => trigger);
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should render expression with expression renderer', () => {
    const embeddable = new Embeddable(
      dataPluginMock.createSetupContract().query.timefilter.timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toEqual(savedVis.expression);
  });

  it('should re-render if new input is pushed', () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const embeddable = new Embeddable(
      dataPluginMock.createSetupContract().query.timefilter.timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    embeddable.updateInput({
      timeRange,
      query,
      filters,
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should pass context to embeddable', () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const embeddable = new Embeddable(
      dataPluginMock.createSetupContract().query.timefilter.timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123', timeRange, query, filters }
    );
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0].searchContext).toEqual({
      timeRange,
      query,
      filters,
    });
  });

  it('should execute trigger on event from expression renderer', () => {
    const embeddable = new Embeddable(
      dataPluginMock.createSetupContract().query.timefilter.timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123' }
    );
    embeddable.render(mountpoint);

    const onEvent = expressionRenderer.mock.calls[0][0].onEvent!;

    const eventData = {};
    onEvent({ name: 'brush', data: eventData });

    expect(getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush);
    expect(trigger.exec).toHaveBeenCalledWith(
      expect.objectContaining({ data: eventData, embeddable: expect.anything() })
    );
  });

  it('should not re-render if only change is in disabled filter', () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const embeddable = new Embeddable(
      dataPluginMock.createSetupContract().query.timefilter.timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123', timeRange, query, filters }
    );
    embeddable.render(mountpoint);

    embeddable.updateInput({
      timeRange,
      query,
      filters: [{ meta: { alias: 'test', negate: true, disabled: true } }],
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
  });

  it('should re-render on auto refresh fetch observable', () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const autoRefreshFetchSubject = new Subject();
    const timefilter = ({
      getAutoRefreshFetch$: () => autoRefreshFetchSubject.asObservable(),
    } as unknown) as TimefilterContract;

    const embeddable = new Embeddable(
      timefilter,
      expressionRenderer,
      getTrigger,
      {
        editPath: '',
        editUrl: '',
        editable: true,
        savedVis,
      },
      { id: '123', timeRange, query, filters }
    );
    embeddable.render(mountpoint);

    autoRefreshFetchSubject.next();

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });
});
