/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CellActionExecutionContext } from '@kbn/cell-actions';

import { createShowTopNCellActionFactory } from './show_top_n';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { StartServices } from '../../../types';

jest.mock('../../../common/lib/kibana');

const mockServices = {
  ...createStartServicesMock(),
  topValuesPopover: { showPopover: jest.fn() },
} as unknown as StartServices;

const element = document.createElement('div');
document.body.appendChild(element);

describe('createShowTopNCellActionFactory', () => {
  const showTopNActionFactory = createShowTopNCellActionFactory({
    services: mockServices,
  });
  const showTopNAction = showTopNActionFactory({ id: 'testAction' });

  const context = {
    data: [
      {
        value: 'the-value',
        field: {
          name: 'user.name',
          type: KBN_FIELD_TYPES.STRING,
          aggregatable: true,
          searchable: true,
        },
      },
    ],
    trigger: { id: 'trigger' },
    nodeRef: {
      current: element,
    },
    metadata: undefined,
  } as CellActionExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return display name', () => {
    expect(showTopNAction.getDisplayName(context)).toEqual('Show top user.name');
  });

  it('should return icon type', () => {
    expect(showTopNAction.getIconType(context)).toEqual('visBarVertical');
  });

  describe('isCompatible', () => {
    it('should return false if field is not aggregatable', async () => {
      expect(
        await showTopNAction.isCompatible({
          ...context,
          data: [
            {
              field: { ...context.data[0].field, aggregatable: false },
            },
          ],
        })
      ).toEqual(false);
    });

    it('should return false if field is nested', async () => {
      expect(
        await showTopNAction.isCompatible({
          ...context,
          data: [
            {
              field: { ...context.data[0].field, subType: { nested: { path: 'test_path' } } },
            },
          ],
        })
      ).toEqual(false);
    });

    describe.each([
      { type: KBN_FIELD_TYPES.STRING, expectedValue: true },
      { type: KBN_FIELD_TYPES.BOOLEAN, expectedValue: true },
      { type: KBN_FIELD_TYPES.NUMBER, expectedValue: true },
      { type: KBN_FIELD_TYPES.IP, expectedValue: true },
      { type: KBN_FIELD_TYPES.DATE, expectedValue: false },
      { type: KBN_FIELD_TYPES.GEO_SHAPE, expectedValue: false },
      { type: KBN_FIELD_TYPES.IP_RANGE, expectedValue: false },
    ])('lens supported KBN types', ({ type, expectedValue }) => {
      it(`should return ${expectedValue} when type is ${type}`, async () => {
        expect(
          await showTopNAction.isCompatible({
            ...context,
            data: [
              {
                field: { ...context.data[0].field, type },
              },
            ],
          })
        ).toEqual(expectedValue);
      });
    });
  });

  describe('execute', () => {
    it('should execute normally', async () => {
      await showTopNAction.execute(context);

      expect(mockServices.topValuesPopover.showPopover).toHaveBeenCalled();
    });
  });
});
