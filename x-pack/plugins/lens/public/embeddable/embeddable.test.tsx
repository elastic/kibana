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
} from './embeddable';
import { ReactExpressionRendererProps } from 'src/plugins/expressions/public';
import { spacesPluginMock } from '../../../spaces/public/mocks';
import { Filter } from '@kbn/es-query';
import { Query, TimeRange, FilterManager } from 'src/plugins/data/public';
import type { DataViewsContract } from 'src/plugins/data_views/public';
import { Document } from '../persistence';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public/embeddable';
import { coreMock, httpServiceMock, themeServiceMock } from '../../../../../src/core/public/mocks';
import { IBasePath } from '../../../../../src/core/public';
import { AttributeService, ViewMode } from '../../../../../src/plugins/embeddable/public';
import { LensAttributeService } from '../lens_attribute_service';
import { OnSaveProps } from '../../../../../src/plugins/saved_objects/public/save_modal';
import { act } from 'react-dom/test-utils';
import { inspectorPluginMock } from '../../../../../src/plugins/inspector/public/mocks';
import { Visualization } from '../types';

jest.mock('../../../../../src/plugins/inspector/public/', () => ({
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
const defaultUnwrapMethod = (
  savedObjectId: string
): Promise<{ attributes: LensSavedObjectAttributes }> => {
  return new Promise(() => {
    return { attributes: { ...savedVis } };
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

const mockInjectFilterReferences: FilterManager['inject'] = (filters, references) => {
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
  >('lens', jest.fn(), core.i18n.Context, core.notifications.toasts, options);
  service.unwrapAttributes = jest.fn((input: LensByValueInput | LensByReferenceInput) => {
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

describe('embeddable', () => {
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

  it('should render expression once with expression renderer', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        inspector: inspectorPluginMock.createStartContract(),
        getTrigger,
        theme: themeServiceMock.createStartContract(),
        visualizationMap: {},
        datasourceMap: {},
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
            errors: undefined,
          }),
      },
      {
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      } as LensEmbeddableInput
    );
    embeddable.render(mountpoint);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
    expect(expressionRenderer.mock.calls[0][0]!.expression).toEqual(`my
| expression`);
  });

  it('should render once even if reload is called before embeddable is fully initialized', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        indexPatternService: {} as DataViewsContract,
        inspector: inspectorPluginMock.createStartContract(),
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      {
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      } as LensEmbeddableInput
    );
    await embeddable.reload();
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);

    // wait one tick to give embeddable time to initialize
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(1);
  });

  it('should not render the visualization if any error arises', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: [{ shortMessage: '', longMessage: 'my validation error' }],
          }),
      },
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(0);
  });

  it('should not render the vis if loaded saved object conflicts', async () => {
    attributeService.unwrapAttributes = jest.fn(
      (input: LensByValueInput | LensByReferenceInput) => {
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
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        inspector: inspectorPluginMock.createStartContract(),
        expressionRenderer,
        basePath,
        indexPatternService: {} as DataViewsContract,
        spaces: spacesPluginStart,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
    expect(spacesPluginStart.ui.components.getEmbeddableLegacyUrlConflict).toHaveBeenCalled();
  });

  it('should not render if timeRange prop is not passed when a referenced data view is time based', async () => {
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
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {
          get: (id: string) => Promise.resolve({ id, isTimeBased: jest.fn(() => true) }),
        } as unknown as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      {} as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({} as LensEmbeddableInput);
    embeddable.render(mountpoint);
    expect(expressionRenderer).toHaveBeenCalledTimes(0);
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
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {
          get: (id: string) => Promise.resolve({ id, isTimeBased: () => false }),
        } as unknown as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
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
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      timeRange,
      query,
      filters,
      searchSessionId: 'searchSessionId',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(2);
  });

  it('should re-render once if session id changes and ', async () => {
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      searchSessionId: 'newSession',
    });
    embeddable.reload();

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
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
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
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
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

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
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
      renderMode: 'view',
      disableTriggers: true,
    } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      input
    );
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
    attributeService = attributeServiceMockFromSavedVis(newSavedVis);

    const input = { savedObjectId: '123', timeRange, query, filters } as LensEmbeddableInput;

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: { get: jest.fn() } as unknown as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
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
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
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
    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123' } as LensEmbeddableInput
    );
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

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
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

  it('should call onload after rerender and onData$ call ', async () => {
    const onLoad = jest.fn();

    expressionRenderer = jest.fn(({ onData$ }) => {
      setTimeout(() => {
        onData$?.({});
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123', onLoad } as unknown as LensEmbeddableInput
    );

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    expect(onLoad).toHaveBeenCalledWith(true);
    expect(onLoad).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 20));

    // loading should become false
    expect(onLoad).toHaveBeenCalledTimes(2);
    expect(onLoad).toHaveBeenNthCalledWith(2, false);

    expect(expressionRenderer).toHaveBeenCalledTimes(1);

    embeddable.updateInput({
      searchSessionId: 'newSession',
    });
    embeddable.reload();

    // loading should become again true
    expect(onLoad).toHaveBeenCalledTimes(3);
    expect(onLoad).toHaveBeenNthCalledWith(3, true);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expressionRenderer).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setTimeout(resolve, 20));

    // loading should again become false
    expect(onLoad).toHaveBeenCalledTimes(4);
    expect(onLoad).toHaveBeenNthCalledWith(4, false);
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

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123', onFilter } as unknown as LensEmbeddableInput
    );

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ pings: false }));
    expect(onFilter).toHaveBeenCalledTimes(1);
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

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123', onBrushEnd } as unknown as LensEmbeddableInput
    );

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onBrushEnd).toHaveBeenCalledWith(expect.objectContaining({ range: [0, 1] }));
    expect(onBrushEnd).toHaveBeenCalledTimes(1);
  });

  it('should call onTableRowClick event ', async () => {
    const onTableRowClick = jest.fn();

    expressionRenderer = jest.fn(({ onEvent }) => {
      setTimeout(() => {
        onEvent?.({ name: 'tableRowContextMenuClick', data: { name: 'test' } });
      }, 10);

      return null;
    });

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService,
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        visualizationMap: {},
        datasourceMap: {},
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        theme: themeServiceMock.createStartContract(),
        documentToExpression: () =>
          Promise.resolve({
            ast: {
              type: 'expression',
              chain: [
                { type: 'function', function: 'my', arguments: {} },
                { type: 'function', function: 'expression', arguments: {} },
              ],
            },
            errors: undefined,
          }),
      },
      { id: '123', onTableRowClick } as unknown as LensEmbeddableInput
    );

    await embeddable.initializeSavedVis({ id: '123' } as LensEmbeddableInput);
    embeddable.render(mountpoint);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onTableRowClick).toHaveBeenCalledWith({ name: 'test' });
    expect(onTableRowClick).toHaveBeenCalledTimes(1);
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
        errors: undefined,
      };
    });

    const visDocument: Document = {
      state: {
        visualization: {},
        datasourceStates: {},
        query: { query: '', language: 'lucene' },
        filters: [],
      },
      references: [],
      title: 'My title',
      visualizationType: 'lensDatatable',
    };

    const embeddable = new Embeddable(
      {
        timefilter: dataPluginMock.createSetupContract().query.timefilter.timefilter,
        attributeService: attributeServiceMockFromSavedVis(visDocument),
        expressionRenderer,
        basePath,
        inspector: inspectorPluginMock.createStartContract(),
        indexPatternService: {} as DataViewsContract,
        capabilities: {
          canSaveDashboards: true,
          canSaveVisualizations: true,
          discover: {},
          navLinks: {},
        },
        getTrigger,
        theme: themeServiceMock.createStartContract(),
        injectFilterReferences: jest.fn(mockInjectFilterReferences),
        visualizationMap: {
          [visDocument.visualizationType as string]: {
            onEditAction: onEditActionMock,
          } as unknown as Visualization,
        },
        datasourceMap: {},
        documentToExpression: documentToExpressionMock,
      },
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
});
