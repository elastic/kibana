/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  Embeddable,
  LensByValueInput,
  LensUnwrapMetaInfo,
  LensEmbeddableInput,
  LensByReferenceInput,
  LensSavedObjectAttributes,
  LensUnwrapResult,
  LensEmbeddableDeps,
} from './embeddable';
import { ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { Document } from '../persistence';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public/embeddable';
import { coreMock, httpServiceMock } from '@kbn/core/public/mocks';
import { IBasePath, IUiSettingsClient } from '@kbn/core/public';
import { AttributeService, ViewMode } from '@kbn/embeddable-plugin/public';
import { LensAttributeService } from '../lens_attribute_service';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public/save_modal';
import { act } from 'react-dom/test-utils';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { Visualization } from '../types';
import { createMockDatasource, createMockVisualization } from '../mocks';

jest.mock('@kbn/inspector-plugin/public', () => ({
  isAvailable: false,
  open: false,
}));

const defaultVisualizationId = 'lnsSomeVisType';
const defaultDatasourceId = 'someDatasource';

const savedVis: Document = {
  state: {
    visualization: { activeId: defaultVisualizationId },
    datasourceStates: { [defaultDatasourceId]: {} },
    query: { query: '', language: 'lucene' },
    filters: [],
  },
  references: [],
  title: 'My title',
  visualizationType: defaultVisualizationId,
};

const defaultVisualizationMap = {
  [defaultVisualizationId]: createMockVisualization(),
};

const defaultDatasourceMap = {
  [defaultDatasourceId]: createMockDatasource(defaultDatasourceId),
};

const defaultSaveMethod = (
  _testAttributes: LensSavedObjectAttributes,
  _savedObjectId?: string
): Promise<{ id: string }> => {
  return new Promise(() => {
    return { id: '123' };
  });
};
const defaultUnwrapMethod = (
  _savedObjectId: string
): Promise<{ attributes: LensSavedObjectAttributes }> => {
  return new Promise(() => {
    return { attributes: { ...savedVis } };
  });
};
const defaultCheckForDuplicateTitle = (_props: OnSaveProps): Promise<true> => {
  return new Promise(() => {
    return true;
  });
};
const options = {
  saveMethod: defaultSaveMethod,
  unwrapMethod: defaultUnwrapMethod,
  checkForDuplicateTitle: defaultCheckForDuplicateTitle,
};

const mockInjectFilterReferences: FilterManager['inject'] = (filters, _references) => {
  return filters.map((filter) => ({
    ...filter,
    meta: {
      ...filter.meta,
      index: 'injected!',
    },
  }));
};

const attributeServiceMockFromSavedVis = (document: Document): LensAttributeService => {
  const core = coreMock.createStart();
  const service = new AttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput,
    LensUnwrapMetaInfo
  >('lens', core.notifications.toasts, options);
  service.unwrapAttributes = jest.fn((_input: LensByValueInput | LensByReferenceInput) => {
    return Promise.resolve({
      attributes: {
        ...document,
      },
      metaInfo: {
        sharingSavedObjectProps: {
          outcome: 'exactMatch',
        },
      },
    } as LensUnwrapResult);
  });
  service.wrapAttributes = jest.fn();
  return service;
};

const dataMock = dataPluginMock.createStartContract();

describe('embeddable', () => {
  const coreStart = coreMock.createStart();

  let mountpoint: HTMLDivElement;
  let expressionRenderer: jest.Mock<null, [ReactExpressionRendererProps]>;
  let getTrigger: jest.Mock;
  let trigger: { exec: jest.Mock };
  let basePath: IBasePath;
  let attributeService: AttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput,
    LensUnwrapMetaInfo
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

  function getEmbeddableProps(props: Partial<LensEmbeddableDeps> = {}): LensEmbeddableDeps {
    return {
      timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
      attributeService,
      data: dataMock,
      uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
      inspector: inspectorPluginMock.createStartContract(),
      expressionRenderer,
      coreStart,
      basePath,
      dataViews: {
        get: (id: string) => Promise.resolve({ id, isTimeBased: () => false }),
      } as unknown as DataViewsContract,
      capabilities: {
        canSaveDashboards: true,
        canSaveVisualizations: true,
        canOpenVisualizations: true,
        discover: {},
        navLinks: {},
      },
      getTrigger,
      visualizationMap: defaultVisualizationMap,
      datasourceMap: defaultDatasourceMap,
      injectFilterReferences: jest.fn(mockInjectFilterReferences),
      documentToExpression: () =>
        Promise.resolve({
          ast: {
            type: 'expression',
            chain: [
              { type: 'function', function: 'my', arguments: {} },
              { type: 'function', function: 'expression', arguments: {} },
            ],
          },
          indexPatterns: {},
          indexPatternRefs: [],
          activeVisualizationState: null,
        }),
      ...props,
    };
  }

  it('should render expression once with expression renderer', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), {
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toEqual(`my
| expression`);
  });

  it('should not throw if render is called after destroy', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), {
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    } as LensEmbeddableInput);
    let renderCalled = false;
    let renderThrew = false;
    // destroying completes output synchronously which might make a synchronous render call - this shouldn't throw
    embeddable.getOutput$().subscribe(undefined, undefined, () => {
      try {
        embeddable.render(mountpoint);
      } catch (e) {
        renderThrew = true;
      } finally {
        renderCalled = true;
      }
    });
    embeddable.destroy();
    expect(renderCalled).toBe(true);
    expect(renderThrew).toBe(false);
  });

  it('should render once even if reload is called before embeddable is fully initialized', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), {
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    } as LensEmbeddableInput);
    embeddable.reload();
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
  });

  it('should not render the visualization if any error arises', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), {} as LensEmbeddableInput);

    jest.spyOn(embeddable, 'getUserMessages').mockReturnValue([
      {
        uniqueId: 'error',
        severity: 'error',
        fixableInEditor: true,
        displayLocations: [{ id: 'visualization' }],
        longMessage: 'lol',
        shortMessage: 'lol',
      },
    ]);

    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(0);
  });

  it('should not render the vis if loaded saved object conflicts', async () => {
    attributeService.unwrapAttributes = jest.fn(
      (_input: LensByValueInput | LensByReferenceInput) => {
        return Promise.resolve({
          attributes: {
            ...savedVis,
          },
          metaInfo: {
            sharingSavedObjectProps: {
              outcome: 'conflict',
              sourceId: '1',
              aliasTargetId: '2',
            },
          },
        } as LensUnwrapResult);
      }
    );
    const spacesPluginStart = spacesPluginMock.createStartContract();
    spacesPluginStart.ui.components.getEmbeddableLegacyUrlConflict = jest.fn(() => (
      <>getEmbeddableLegacyUrlConflict</>
    ));
    const embeddable = new Embeddable(
      getEmbeddableProps({
        spaces: spacesPluginStart,
        attributeService,
      }),
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
    expect(spacesPluginStart.ui.components.getEmbeddableLegacyUrlConflict).toHaveBeenCalled();
  });

  it('should not render if timeRange prop is not passed when a referenced data view is time based', async () => {
    const embeddable = new Embeddable(
      getEmbeddableProps({
        attributeService: attributeServiceMockFromSavedVis({
          ...savedVis,
          references: [
            { type: 'index-pattern', id: '123', name: 'abc' },
            { type: 'index-pattern', id: '123', name: 'def' },
            { type: 'index-pattern', id: '456', name: 'ghi' },
          ],
        }),
        dataViews: {
          get: (id: string) => Promise.resolve({ id, isTimeBased: () => true }),
        } as unknown as DataViewsContract,
      }),
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
  });

  it('should initialize output with deduped list of index patterns', async () => {
    const embeddable = new Embeddable(
      getEmbeddableProps({
        attributeService: attributeServiceMockFromSavedVis({
          ...savedVis,
          references: [
            { type: 'index-pattern', id: '123', name: 'abc' },
            { type: 'index-pattern', id: '123', name: 'def' },
            { type: 'index-pattern', id: '456', name: 'ghi' },
          ],
        }),
      }),
      {} as LensEmbeddableInput
    );

    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    const outputIndexPatterns = embeddable.getOutput().indexPatterns!;
    expect(outputIndexPatterns.length).toEqual(2);
    expect(outputIndexPatterns[0].id).toEqual('123');
    expect(outputIndexPatterns[1].id).toEqual('456');
  });

  it('should re-render once on filter change', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        data: dataMock,
        uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
        expressionRenderer,
        coreStart,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        dataViews: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          canOpenVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: defaultVisualizationMap,
        datasourceMap: defaultDatasourceMap,
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            indexPatterns: {},
            indexPatternRefs: [],
            activeVisualizationState: null,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      filters: [{ meta: { alias: 'test', negate: false, disabled: false } }],
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should re-render once on search session change', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        data: dataMock,
        uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
        expressionRenderer,
        coreStart,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        dataViews: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          canOpenVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: defaultVisualizationMap,
        datasourceMap: defaultDatasourceMap,
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            indexPatterns: {},
            indexPatternRefs: [],
            activeVisualizationState: null,
          }),
      },
      { id: '123', searchSessionId: 'firstSession' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      searchSessionId: 'nextSession',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should re-render when dashboard view/edit mode changes if dynamic actions are set', async () => {
    const sampleInput = {
      id: '123',
      enhancements: {
        dynamicActions: {},
      },
    } as unknown as LensEmbeddableInput;
    const embeddable = new Embeddable(getEmbeddableProps(), { id: '123' } as LensEmbeddableInput);
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      viewMode: ViewMode.VIEW,
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      ...sampleInput,
      viewMode: ViewMode.VIEW,
    });

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should re-render when dynamic actions input changes', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), { id: '123' } as LensEmbeddableInput);
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      enhancements: {
        dynamicActions: {},
      },
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

    const embeddable = new Embeddable(getEmbeddableProps(), input);
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
      renderMode: 'view',
      disableTriggers: true,
    } as LensEmbeddableInput;

    const embeddable = new Embeddable(getEmbeddableProps(), input);
    await embeddable.initializeSavedVis(input);
    embeddable.render(mountpoint);

    expect(expressionRenderer.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        interactive: false,
        renderMode: 'view',
      })
    );
  });

  it('should merge external context with query and filters of the saved object', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: 'external query' };
    const filters: Filter[] = [
      { meta: { alias: 'external filter', negate: false, disabled: false } },
    ];

    const newSavedVis = {
      ...savedVis,
      state: {
        ...savedVis.state,
        query: { language: 'kquery', query: 'saved filter' },
        filters: [{ meta: { alias: 'test', negate: false, disabled: false, index: 'filter-0' } }],
      },
      references: [{ type: 'index-pattern', name: 'filter-0', id: 'my-index-pattern-id' }],
    };

    const input = { savedObjectId: '123', timeRange, query, filters } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      getEmbeddableProps({ attributeService: attributeServiceMockFromSavedVis(newSavedVis) }),
      input
    );
    await embeddable.initializeSavedVis(input);
    embeddable.render(mountpoint);

    const expectedFilters = [
      ...input.filters!,
      ...mockInjectFilterReferences(newSavedVis.state.filters, []),
    ];
    expect(expressionRenderer.mock.calls[0][0].searchContext?.timeRange).toEqual(timeRange);
    expect(expressionRenderer.mock.calls[0][0].searchContext?.filters).toEqual(expectedFilters);
    expect(expressionRenderer.mock.calls[0][0].searchContext?.query).toEqual([
      query,
      { language: 'kquery', query: 'saved filter' },
    ]);
  });

  it('should execute trigger on event from expression renderer', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), { id: '123' } as LensEmbeddableInput);
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    const onEvent = expressionRenderer.mock.calls[0][0].onEvent!;

    const eventData = { myData: true, table: { rows: [], columns: [] }, column: 0 };
    onEvent({ name: 'brush', data: eventData });

    expect(getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.brush);
    expect(trigger.exec).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...eventData, timeFieldName: undefined },
        embeddable: expect.anything(),
      })
    );
  });

  it('should execute trigger on row click event from expression renderer', async () => {
    const embeddable = new Embeddable(getEmbeddableProps(), { id: '123' } as LensEmbeddableInput);
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    const onEvent = expressionRenderer.mock.calls[0][0].onEvent!;

    onEvent({ name: 'tableRowContextMenuClick', data: {} });

    expect(getTrigger).toHaveBeenCalledWith(VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick);
  });

  it('should not re-render if only change is in disabled filter', async () => {
    const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
    const query: Query = { language: 'kquery', query: '' };
    const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];

    const embeddable = new Embeddable(getEmbeddableProps(), {
      id: '123',
      timeRange,
      query,
      filters,
    } as LensEmbeddableInput);
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

  it('should call onload after rerender and onData$ call ', async () => {
    const onDataTimeout = 10;
    const onLoad = jest.fn();
    const adapters = { tables: {} };

    expressionRenderer = jest.fn(({ onData$ }) => {
      setTimeout(() => {
        onData$?.({}, adapters);
      }, onDataTimeout);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onLoad,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(onLoad).toHaveBeenCalledWith(true);
    expect(onLoad).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, onDataTimeout * 1.5));

    // loading should become false
    expect(onLoad).toHaveBeenCalledTimes(2);
    expect(onLoad).toHaveBeenNthCalledWith(2, false, adapters, embeddable.getOutput$());

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      searchSessionId: 'newSession',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // loading should become again true
    expect(onLoad).toHaveBeenCalledTimes(3);
    expect(onLoad).toHaveBeenNthCalledWith(3, true);
    expect(expressionRenderer).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setTimeout(resolve, onDataTimeout * 1.5));

    // loading should again become false
    expect(onLoad).toHaveBeenCalledTimes(4);
    expect(onLoad).toHaveBeenNthCalledWith(4, false, adapters, embeddable.getOutput$());
  });

  it('should call onFilter event on filter call ', async () => {
    const onFilter = jest.fn();

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({
          name: 'filter',
          data: { pings: false, table: { rows: [], columns: [] }, column: 0 },
        });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onFilter,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ pings: false }));
    expect(onFilter).toHaveBeenCalledTimes(1);
  });

  it('should prevent the onFilter trigger when calling preventDefault', async () => {
    const onFilter = jest.fn(({ preventDefault }) => preventDefault());

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({
          name: 'filter',
          data: { pings: false, table: { rows: [], columns: [] }, column: 0 },
        });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onFilter,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getTrigger).not.toHaveBeenCalled();
  });

  it('should call onBrush event on brushing', async () => {
    const onBrushEnd = jest.fn();

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({
          name: 'brush',
          data: { range: [0, 1], table: { rows: [], columns: [] }, column: 0 },
        });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onBrushEnd,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onBrushEnd).toHaveBeenCalledWith(expect.objectContaining({ range: [0, 1] }));
    expect(onBrushEnd).toHaveBeenCalledTimes(1);
  });

  it('should prevent the onBrush trigger when calling preventDefault', async () => {
    const onBrushEnd = jest.fn(({ preventDefault }) => preventDefault());

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({
          name: 'brush',
          data: { range: [0, 1], table: { rows: [], columns: [] }, column: 0 },
        });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onBrushEnd,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getTrigger).not.toHaveBeenCalled();
  });

  it('should call onTableRowClick event ', async () => {
    const onTableRowClick = jest.fn();

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({ name: 'tableRowContextMenuClick', data: { name: 'test' } });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onTableRowClick,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onTableRowClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
    expect(onTableRowClick).toHaveBeenCalledTimes(1);
  });

  it('should prevent onTableRowClick trigger when calling preventDefault ', async () => {
    const onTableRowClick = jest.fn(({ preventDefault }) => preventDefault());

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({ name: 'tableRowContextMenuClick', data: { name: 'test' } });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(getEmbeddableProps({ expressionRenderer }), {
      id: '123',
      onTableRowClick,
    } as unknown as LensEmbeddableInput);

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getTrigger).not.toHaveBeenCalled();
  });

  it('handles edit actions ', async () => {
    const editedVisualizationState = { value: 'edited' };
    const onEditActionMock = jest.fn().mockReturnValue(editedVisualizationState);
    const documentToExpressionMock = jest.fn().mockImplementation(async (document) => {
      const isStateEdited = document.state.visualization.value === 'edited';
      return {
        ast: {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: isStateEdited ? 'edited' : 'not_edited',
              arguments: {},
            },
          ],
        },
        indexPatterns: {},
        indexPatternRefs: [],
      };
    });

    const visDocument: Document = {
      state: {
        visualization: {},
        datasourceStates: { [defaultDatasourceId]: {} },
        query: { query: '', language: 'lucene' },
        filters: [],
      },
      references: [],
      title: 'My title',
      visualizationType: 'lensDatatable',
    };

    const embeddable = new Embeddable(
      getEmbeddableProps({
        attributeService: attributeServiceMockFromSavedVis(visDocument),
        visualizationMap: {
          [visDocument.visualizationType as string]: {
            onEditAction: onEditActionMock,
            initialize: () => {},
          } as unknown as Visualization,
        },
        documentToExpression: documentToExpressionMock,
      }),
      { id: '123' } as unknown as LensEmbeddableInput
    );

    // SETUP FRESH STATE
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toBe(`not_edited`);

    // TEST EDIT EVENT
    await embeddable.handleEvent({ name: 'edit' });

    expect(onEditActionMock).toHaveBeenCalledTimes(1);
    expect(documentToExpressionMock).toHaveBeenCalled();

    const docToExpCalls = documentToExpressionMock.mock.calls;
    const editedVisDocument = docToExpCalls[docToExpCalls.length - 1][0];
    expect(editedVisDocument.state.visualization).toEqual(editedVisualizationState);

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
    expect(expressionRenderer.mock.calls[1][0]!.expression).toBe(`edited`);
  });

  it('should override noPadding in the display options if noPadding is set in the embeddable input', async () => {
    expressionRenderer = jest.fn((_) => null);

    const createEmbeddable = (displayOptions?: { noPadding: boolean }, noPadding?: boolean) => {
      return new Embeddable(
        {
          timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
          attributeService: attributeServiceMockFromSavedVis(savedVis),
          data: dataMock,
          expressionRenderer,
          coreStart,
          basePath,
          dataViews: {} as DataViewsContract,
          capabilities: {
            canSaveDashboards: true,
            canSaveVisualizations: true,
            canOpenVisualizations: true,
            discover: {},
            navLinks: {},
          },
          inspector: inspectorPluginMock.createStartContract(),
          getTrigger,
          visualizationMap: {
            [savedVis.visualizationType as string]: {
              getDisplayOptions: displayOptions ? () => displayOptions : undefined,
              initialize: () => {},
            } as unknown as Visualization,
          },
          datasourceMap: defaultDatasourceMap,
          injectFilterReferences: jest.fn(mockInjectFilterReferences),
          documentToExpression: () =>
            Promise.resolve({
              ast: {
                type: 'expression',
                chain: [
                  { type: 'function', function: 'my', arguments: {} },
                  { type: 'function', function: 'expression', arguments: {} },
                ],
              },
              indexPatterns: {},
              indexPatternRefs: [],
              activeVisualizationState: null,
            }),
          uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
        },
        {
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          noPadding,
        } as LensEmbeddableInput
      );
    };

    // no display options and no override
    let embeddable = createEmbeddable();
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.padding).toBe('s');

    // display options and no override
    embeddable = createEmbeddable({ noPadding: true });
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
    expect(expressionRenderer.mock.calls[1][0]!.padding).toBe(undefined);

    // no display options and override
    embeddable = createEmbeddable(undefined, true);
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(3);
    expect(expressionRenderer.mock.calls[1][0]!.padding).toBe(undefined);

    // display options and override
    embeddable = createEmbeddable({ noPadding: false }, true);
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(4);
    expect(expressionRenderer.mock.calls[1][0]!.padding).toBe(undefined);
  });

  it('should reload only once when the attributes or savedObjectId and the search context change at the same time', async () => {
    const createEmbeddable = async () => {
      const currentExpressionRenderer = jest.fn((_props) => null);
      const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
      const query: Query = { language: 'kquery', query: '' };
      const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];
      const embeddable = new Embeddable(
        {
          timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
          attributeService,
          data: dataMock,
          uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
          expressionRenderer: currentExpressionRenderer,
          coreStart,
          basePath,
          inspector: inspectorPluginMock.createStartContract(),
          dataViews: {} as DataViewsContract,
          capabilities: {
            canSaveDashboards: true,
            canSaveVisualizations: true,
            canOpenVisualizations: true,
            discover: {},
            navLinks: {},
          },
          getTrigger,
          visualizationMap: defaultVisualizationMap,
          datasourceMap: defaultDatasourceMap,
          injectFilterReferences: jest.fn(mockInjectFilterReferences),
          documentToExpression: () =>
            Promise.resolve({
              ast: {
                type: 'expression',
                chain: [
                  { type: 'function', function: 'my', arguments: {} },
                  { type: 'function', function: 'expression', arguments: {} },
                ],
              },
              indexPatterns: {},
              indexPatternRefs: [],
              activeVisualizationState: null,
            }),
        },
        { id: '123', timeRange, query, filters } as LensEmbeddableInput
      );
      const reload = jest.spyOn(embeddable, 'reload');
      const initializeSavedVis = jest.spyOn(embeddable, 'initializeSavedVis');

      await embeddable.initializeSavedVis({
        id: '123',
        timeRange,
        query,
        filters,
      } as LensEmbeddableInput);

      embeddable.render(mountpoint);

      return {
        embeddable,
        reload,
        initializeSavedVis,
        expressionRenderer: currentExpressionRenderer,
      };
    };

    let test = await createEmbeddable();

    expect(test.reload).toHaveBeenCalledTimes(1);
    expect(test.initializeSavedVis).toHaveBeenCalledTimes(1);
    expect(test.expressionRenderer).toHaveBeenCalledTimes(1);

    // Test with savedObjectId and searchSessionId change
    act(() => {
      test.embeddable.updateInput({ savedObjectId: '123', searchSessionId: '456' });
    });

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(test.reload).toHaveBeenCalledTimes(2);
    expect(test.initializeSavedVis).toHaveBeenCalledTimes(2);
    expect(test.expressionRenderer).toHaveBeenCalledTimes(2);

    test = await createEmbeddable();

    expect(test.reload).toHaveBeenCalledTimes(1);
    expect(test.initializeSavedVis).toHaveBeenCalledTimes(1);
    expect(test.expressionRenderer).toHaveBeenCalledTimes(1);

    // Test with attributes and timeRange change
    act(() => {
      test.embeddable.updateInput({
        attributes: { foo: 'bar' } as unknown as LensSavedObjectAttributes,
        timeRange: { from: 'now-30d', to: 'now' },
      });
    });

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(test.reload).toHaveBeenCalledTimes(2);
    expect(test.initializeSavedVis).toHaveBeenCalledTimes(2);
    expect(test.expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should get full attributes', async () => {
    const createEmbeddable = async () => {
      const currentExpressionRenderer = jest.fn((_props) => null);
      const timeRange: TimeRange = { from: 'now-15d', to: 'now' };
      const query: Query = { language: 'kquery', query: '' };
      const filters: Filter[] = [{ meta: { alias: 'test', negate: false, disabled: true } }];
      const embeddable = new Embeddable(
        {
          timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
          attributeService,
          data: dataMock,
          uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
          expressionRenderer: currentExpressionRenderer,
          coreStart,
          basePath,
          inspector: inspectorPluginMock.createStartContract(),
          dataViews: {} as DataViewsContract,
          capabilities: {
            canSaveDashboards: true,
            canSaveVisualizations: true,
            canOpenVisualizations: true,
            discover: {},
            navLinks: {},
          },
          getTrigger,
          visualizationMap: defaultVisualizationMap,
          datasourceMap: defaultDatasourceMap,
          injectFilterReferences: jest.fn(mockInjectFilterReferences),
          documentToExpression: () =>
            Promise.resolve({
              ast: {
                type: 'expression',
                chain: [
                  { type: 'function', function: 'my', arguments: {} },
                  { type: 'function', function: 'expression', arguments: {} },
                ],
              },
              indexPatterns: {},
              indexPatternRefs: [],
              activeVisualizationState: null,
            }),
        },
        { id: '123', timeRange, query, filters } as LensEmbeddableInput
      );
      const reload = jest.spyOn(embeddable, 'reload');
      const initializeSavedVis = jest.spyOn(embeddable, 'initializeSavedVis');

      await embeddable.initializeSavedVis({
        id: '123',
        timeRange,
        query,
        filters,
      } as LensEmbeddableInput);

      embeddable.render(mountpoint);

      return {
        embeddable,
        reload,
        initializeSavedVis,
        expressionRenderer: currentExpressionRenderer,
      };
    };

    const test = await createEmbeddable();

    expect(test.embeddable.getFullAttributes()).toEqual(savedVis);
  });

  it('should pass over the overrides as variables', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        data: dataMock,
        expressionRenderer,
        coreStart,
        basePath,
        dataViews: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          canOpenVisualizations: true,
          discover: {},
          navLinks: {},
        },
        inspector: inspectorPluginMock.createStartContract(),
        getTrigger,
        visualizationMap: defaultVisualizationMap,
        datasourceMap: defaultDatasourceMap,
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            indexPatterns: {},
            indexPatternRefs: [],
            activeVisualizationState: null,
          }),
        uiSettings: { get: () => undefined } as unknown as IUiSettingsClient,
      },
      {
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        overrides: {
          settings: {
            onBrushEnd: 'ignore',
          },
        },
      } as LensEmbeddableInput
    );
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.variables).toEqual(
      expect.objectContaining({
        overrides: {
          settings: {
            onBrushEnd: 'ignore',
          },
        },
      })
    );
  });

  it('should not be editable for no visualize library privileges', async () => {
    const embeddable = new Embeddable(
      getEmbeddableProps({
        capabilities: {
          canSaveDashboards: false,
          canSaveVisualizations: true,
          canOpenVisualizations: false,
          discover: {},
          navLinks: {},
        },
      }),
      {
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      } as LensEmbeddableInput
    );
    expect(embeddable.getOutput().editable).toBeUndefined();
  });
});
