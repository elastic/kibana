/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TooltipState } from '../../common/descriptor_types';
import { openOnClickTooltip } from './tooltip_actions';
import { MapStoreState } from '../reducers/store';

describe('openOnClickTooltip', () => {
  const newTooltip = {
    features: [
      {
        id: 'feature1',
        layerId: 'layer1',
      }
    ],
    id: 'tooltip1',
    isLocked: true,
    location: [0, 0],
  } as unknown as TooltipState;

  test('should add tooltip to open tooltips', () => {
    const openTooltip = {
      features: [
        {
          id: 'feature2',
          layerId: 'layer1',
        }
      ],
      id: 'tooltip2',
      isLocked: true,
      location: [1, 1],
    } as unknown as TooltipState;
    const action = openOnClickTooltip(newTooltip);
    const dispatchMock = jest.fn();
    action(dispatchMock, () => {
      return {
        map: {
          openTooltips: [openTooltip]
        }
      } as unknown as MapStoreState;
    });
    expect(dispatchMock.mock.calls[0][0]).toEqual({
      openTooltips: [openTooltip, newTooltip],
      type: 'SET_OPEN_TOOLTIPS',
    });
  });

  test('should remove existing tooltip if its mouseover tooltip', () => {
    const action = openOnClickTooltip(newTooltip);
    const dispatchMock = jest.fn();
    action(dispatchMock, () => {
      return {
        map: {
          openTooltips: [
            {
              features: [
                {
                  id: 'feature2',
                  layerId: 'layer1',
                }
              ],
              id: 'tooltip2',
              isLocked: false,
              location: [1, 1],
            }
          ]
        }
      } as unknown as MapStoreState;
    });
    expect(dispatchMock.mock.calls[0][0]).toEqual({
      openTooltips: [newTooltip],
      type: 'SET_OPEN_TOOLTIPS',
    });
  });

  test('should remove existing tooltip when adding new tooltip at same location', () => {
    const action = openOnClickTooltip(newTooltip);
    const dispatchMock = jest.fn();
    action(dispatchMock, () => {
      return {
        map: {
          openTooltips: [
            {
              features: [
                {
                  id: 'feature2',
                  layerId: 'layer1',
                }
              ],
              id: 'tooltip2',
              isLocked: true,
              location: [0, 0],
            }
          ]
        }
      } as unknown as MapStoreState;
    });
    expect(dispatchMock.mock.calls[0][0]).toEqual({
      openTooltips: [newTooltip],
      type: 'SET_OPEN_TOOLTIPS',
    });
  });

  test('should remove existing tooltip when adding new tooltip with same features', () => {
    const action = openOnClickTooltip(newTooltip);
    const dispatchMock = jest.fn();
    action(dispatchMock, () => {
      return {
        map: {
          openTooltips: [
            {
              features: [
                {
                  id: 'feature1',
                  layerId: 'layer1',
                  // ensure new props do not break equality check
                  newProps: 'someValue',
                }
              ],
              id: 'tooltip2',
              isLocked: true,
              location: [1, 1],
            }
          ]
        }
      } as unknown as MapStoreState;
    });
    expect(dispatchMock.mock.calls[0][0]).toEqual({
      openTooltips: [newTooltip],
      type: 'SET_OPEN_TOOLTIPS',
    });
  });
});
