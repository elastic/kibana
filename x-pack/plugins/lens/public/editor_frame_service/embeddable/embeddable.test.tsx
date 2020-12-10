/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import {
  Embeddable,
  LensByValueInput,
  LensByReferenceInput,
  LensSavedObjectAttributes,
  LensEmbeddableInput,
} from './embeddable';
import { ReactExpressionRendererProps } from 'src/plugins/expressions/public';
import {
  Query,
  TimeRange,
  Filter,
  TimefilterContract,
  IndexPatternsContract,
} from 'src/plugins/data/public';
import { Document } from '../../persistence';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/plugins/visualizations/public/embeddable';
import { coreMock, httpServiceMock } from '../../../../../../src/core/public/mocks';
import { IBasePath } from '../../../../../../src/core/public';
import { AttributeService } from '../../../../../../src/plugins/embeddable/public';
import { LensAttributeService } from '../../lens_attribute_service';
import { OnSaveProps } from '../../../../../../src/plugins/saved_objects/public/save_modal';
import { act } from 'react-dom/test-utils';

jest.mock('../../../../../../src/plugins/inspector/public/', () => ({
  isAvailable: false,
  open: false,
}));

const savedVis: Document = {
  state: {
    visualization: {},
    datasourceStates: {},
    query: { query: '', language: 'lucene' },
    filters: [],
  },
  references: [],
  title: 'My title',
  visualizationType: '',
};
const defaultSaveMethod = (
  testAttributes: LensSavedObjectAttributes,
  savedObjectId?: string
): Promise<{ id: string }> => {
  return new Promise(() => {
    return { id: '123' };
  });
};
const defaultUnwrapMethod = (savedObjectId: string): Promise<LensSavedObjectAttributes> => {
  return new Promise(() => {
    return { ...savedVis };
  });
};
const defaultCheckForDuplicateTitle = (props: OnSaveProps): Promise<true> => {
  return new Promise(() => {
    return true;
  });
};
const options = {
  saveMethod: defaultSaveMethod,
  unwrapMethod: defaultUnwrapMethod,
  checkForDuplicateTitle: defaultCheckForDuplicateTitle,
};

const attributeServiceMockFromSavedVis = (document: Document): LensAttributeService => {
  const core = coreMock.createStart();
  const service = new AttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >('lens', jest.fn(), core.i18n.Context, core.notifications.toasts, options);
  service.unwrapAttributes = jest.fn((input: LensByValueInput | LensByReferenceInput) => {
    return Promise.resolve({ ...document } as LensSavedObjectAttributes);
  });
  service.wrapAttributes = jest.fn();
  return service;
};

describe('embeddable', () => {
  let mountpoint: HTMLDivElement;
  let expressionRenderer: jest.Mock<null, [ReactExpressionRendererProps]>;
  let getTrigger: jest.Mock;
  let trigger: { exec: jest.Mock };
  let basePath: IBasePath;
  let attributeService: AttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >;

  beforeEach(() => {
    mountpoint = document.createElement('div');
    expressionRenderer = jest.fn((_props) => null);
    trigger = { exec: jest.fn() };
    getTrigger = jest.fn(() => trigger);
    attributeService = attributeServiceMockFromSavedVis(savedVis);
    const http = httpServiceMock.createSetupContract({ basePath: '/test' });
    basePath = http.basePath;
  });

  afterEach(() => {
    mountpoint.remove();
  });

  it('should render expression with expression renderer', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toEqual(`my
| expression`);
  });

  it('should initialize output with deduped list of index patterns', async () => {
    attributeService = attributeServiceMockFromSavedVis({
      ...savedVis,
      references: [
        { type: 'index-pattern', id: '123', name: 'abc' },
        { type: 'index-pattern', id: '123', name: 'def' },
        { type: 'index-pattern', id: '456', name: 'ghi' },
      ],
    });
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: ({
          get: (id: string) => Promise.resolve({ id }),
        } as unknown) as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    const outputIndexPatterns = embeddable.getOutput().indexPatterns!;
    expect(outputIndexPatterns.length).toEqual(2);
    expect(outputIndexPatterns[0].id).toEqual('123');
    expect(outputIndexPatterns[1].id).toEqual('456');
  });

  it('should re-render if new input is pushed', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    embeddable.updateInput({
      timeRange,
      query,
      filters,
      searchSessionId: 'searchSessionId',
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should pass context to embeddable', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const input = {
      savedObjectId: '123',
      timeRange,
      query,
      filters,
      searchSessionId: 'searchSessionId',
    } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      input
    );
    await embeddable.initializeSavedVis(input);
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0].searchContext).toEqual(
      expect.objectContaining({
        timeRange,
        query: [query, savedVis.state.query],
        filters,
      })
    );

    expect(expressionRenderer.mock.calls[0][0].searchSessionId).toBe(input.searchSessionId);
  });

  it('should pass render mode to expression', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const input = {
      savedObjectId: '123',
      timeRange,
      query,
      filters,
      renderMode: 'noInteractivity',
    } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      input
    );
    await embeddable.initializeSavedVis(input);
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0].renderMode).toEqual('noInteractivity');
  });

  it('should merge external context with query and filters of the saved object', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: 'external filter' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: false } }];

    const newSavedVis = {
      ...savedVis,
      state: {
        ...savedVis.state,
        query: { language: 'kquery', query: 'saved filter' },
        filters: [
          { meta: { alias: 'test', negate: false, disabled: false, indexRefName: 'filter-0' } },
        ],
      },
      references: [{ type: 'index-pattern', name: 'filter-0', id: 'my-index-pattern-id' }],
    };
    attributeService = attributeServiceMockFromSavedVis(newSavedVis);

    const input = { savedObjectId: '123', timeRange, query, filters } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      input
    );
    await embeddable.initializeSavedVis(input);
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0].searchContext).toEqual({
      timeRange,
      query: [query, { language: 'kquery', query: 'saved filter' }],
      filters: [
        filters[0],
        // actual index pattern id gets injected
        { meta: { alias: 'test', negate: false, disabled: false, index: 'my-index-pattern-id' } },
      ],
    });
  });

  it('should execute trigger on event from expression renderer', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    const onEvent = expressionRenderer.mock.calls[0][0].onEvent!;

    const eventData = {};
    onEvent({ name: 'brush', data: eventData });

    expect(getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush);
    expect(trigger.exec).toHaveBeenCalledWith(
      expect.objectContaining({ data: eventData, embeddable: expect.anything() })
    );
  });

  it('should not re-render if only change is in disabled filter', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      { id: '123', timeRange, query, filters } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({
      id: '123',
      timeRange,
      query,
      filters,
    } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    act(() => {
      embeddable.updateInput({
        timeRange,
        query,
        filters: [{ meta: { alias: 'test', negate: true, disabled: true } }],
      });
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
  });

  it('should re-render on auto refresh fetch observable', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const autoRefreshFetchSubject = new Subject();
    const timefilter = ({
      getAutoRefreshFetch$: () => autoRefreshFetchSubject.asObservable(),
    } as unknown) as TimefilterContract;

    const embeddable = new Embeddable(
      {
        timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as IndexPatternsContract,
        editable: true,
        getTrigger,
        documentToExpression: () =>
          Promise.resolve({
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          }),
      },
      { id: '123', timeRange, query, filters } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({
      id: '123',
      timeRange,
      query,
      filters,
    } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    act(() => {
      autoRefreshFetchSubject.next();
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });
});
