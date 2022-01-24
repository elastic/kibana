/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { fromExpression } from '@kbn/interpreter';
import { createWorkpadRouteContext } from './workpad_route_context';
import { RequestHandlerContext, SavedObjectReference } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { CanvasWorkpad } from '../types';
import { CANVAS_TYPE } from '../common/lib/constants';

const mockedExpressionService = {
  inject: jest.fn(),
  extract: jest.fn(),
};

const savedObjectsClient = savedObjectsClientMock.create();

const mockContext = {
  core: {
    savedObjects: {
      client: savedObjectsClient,
    },
  },
} as unknown as RequestHandlerContext;

const workpadRouteContext = createWorkpadRouteContext({
  expressions: mockedExpressionService as any,
});

const now = new Date();

const injectedExpression = 'fn extracted=false';
const extractedExpression = 'fn extracted=true';

const injectedWorkpad = {
  id: 'workpad-id',
  pages: [
    {
      elements: [
        {
          id: 'element-id',
          expression: injectedExpression,
        },
      ],
    },
  ],
};

const extractedWorkpad = {
  pages: [
    {
      elements: [
        {
          id: 'element-id',
          expression: extractedExpression,
        },
      ],
    },
  ],
};

const references: SavedObjectReference[] = [{ id: 'my-id', name: 'name', type: 'type' }];

describe('workpad route context', () => {
  let clock: sinon.SinonFakeTimers;
  beforeEach(() => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('CREATE', () => {
    it('extracts references before saving', async () => {
      const expectedBody = {
        '@created': now.toISOString(),
        '@timestamp': now.toISOString(),
        ...extractedWorkpad,
      };

      const canvasContext = await workpadRouteContext(
        mockContext,
        undefined as any,
        undefined as any
      );

      mockedExpressionService.extract.mockReturnValue({
        state: fromExpression(extractedExpression),
        references,
      });

      const soResponse = {};
      (mockContext.core.savedObjects.client.create as jest.Mock).mockResolvedValue(soResponse);

      const result = await canvasContext.workpad.create(injectedWorkpad as CanvasWorkpad);

      expect(mockContext.core.savedObjects.client.create).toBeCalledWith(
        CANVAS_TYPE,
        expectedBody,
        {
          id: injectedWorkpad.id,
          references: references.map((r) => ({
            ...r,
            name: `element-id:${r.name}`,
          })),
        }
      );
      expect(result).toBe(soResponse);
    });
  });

  describe('GET', () => {
    it('injects references to the saved object', async () => {
      const id = 'so-id';
      const canvasContext = await workpadRouteContext(
        mockContext,
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.get as jest.Mock).mockResolvedValue({
        attributes: extractedWorkpad,
        references,
      });

      mockedExpressionService.inject.mockReturnValue(fromExpression(injectedExpression));

      const result = await canvasContext.workpad.get(id);
      const { id: ingnoredId, ...expectedAttributes } = injectedWorkpad;

      expect(mockContext.core.savedObjects.client.get).toBeCalledWith(CANVAS_TYPE, id);

      expect(result.attributes).toEqual(expectedAttributes);
    });
  });

  describe('RESOLVE', () => {
    it('injects references to the saved object', async () => {
      const id = 'so-id';
      const canvasContext = await workpadRouteContext(
        mockContext,
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.resolve as jest.Mock).mockResolvedValue({
        saved_object: { attributes: extractedWorkpad, references },
        outcome: 'exactMatch',
      });

      mockedExpressionService.inject.mockReturnValue(fromExpression(injectedExpression));

      const result = await canvasContext.workpad.resolve(id);
      const { id: ingnoredId, ...expectedAttributes } = injectedWorkpad;

      expect(mockContext.core.savedObjects.client.resolve).toBeCalledWith(CANVAS_TYPE, id);

      expect(result.saved_object.attributes).toEqual(expectedAttributes);
    });
  });

  describe('UPDATE', () => {
    it('extracts from the given attributes', async () => {
      const id = 'workpad-id';
      const createdDate = new Date(2020, 1, 1).toISOString();

      const canvasContext = await workpadRouteContext(
        mockContext,
        undefined as any,
        undefined as any
      );

      (mockContext.core.savedObjects.client.get as jest.Mock).mockReturnValue({
        attributes: {
          ...extractedWorkpad,
          '@created': createdDate,
        },
        references,
      });

      const updatedInjectedExpression = 'fn ref="my-value"';
      const updatedExtractedExpression = 'fn ref="extracted"';
      const updatedWorkpad = {
        id: 'workpad-id',
        pages: [
          {
            elements: [
              {
                id: 'new-element-id',
                expression: updatedInjectedExpression,
              },
            ],
          },
        ],
      };

      const expectedWorkpad = {
        '@created': createdDate,
        '@timestamp': now.toISOString(),
        pages: [
          {
            elements: [
              {
                id: 'new-element-id',
                expression: updatedExtractedExpression,
              },
            ],
          },
        ],
      };

      mockedExpressionService.inject.mockReturnValue(fromExpression(injectedExpression));
      mockedExpressionService.extract.mockReturnValue({
        state: fromExpression(updatedExtractedExpression),
        references,
      });

      await canvasContext.workpad.update(id, updatedWorkpad as CanvasWorkpad);

      expect(mockContext.core.savedObjects.client.create).toBeCalledWith(
        CANVAS_TYPE,
        expectedWorkpad,
        {
          id,
          references: references.map((r) => ({
            ...r,
            name: `new-element-id:${r.name}`,
          })),
          overwrite: true,
        }
      );
    });
  });
});
