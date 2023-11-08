/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import type {
  DiscoverCustomization,
  DiscoverCustomizationService,
} from '@kbn/discover-plugin/public/customizations/customization_service';
import type {
  ClickTriggerEventData,
  WithPreventableEvent,
} from '../customizations/use_histogram_customizations';
import { mockPreventDefault } from '../mocks';

type CustomizationSetFunction = (customization: DiscoverCustomization) => void;

export const getMockCustomizationWithCustomSetFunction = (
  mockSetFunction: CustomizationSetFunction
): DiscoverCustomizationService => {
  const mockCustomization = {
    set: mockSetFunction,
  } as DiscoverCustomizationService;

  return mockCustomization;
};

export const getEventDataWithPreventableEvent = <
  T extends ClickTriggerEventData | BrushTriggerEvent['data']
>(
  eventData: T
): WithPreventableEvent<T> => ({
  ...eventData,
  preventDefault: mockPreventDefault,
});
