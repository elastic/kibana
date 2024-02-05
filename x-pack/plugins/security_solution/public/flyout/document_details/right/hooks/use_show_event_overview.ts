/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getField, getFieldArray } from '../../shared/utils';
import { useRightPanelContext } from '../context';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { isEcsAllowedValue } from '../utils/event_utils';

/**
 * Returns true if the event.kind is ecs compliant or event renderer exists
 */
export const showEventOverview = (getFieldsData: GetFieldsData, dataAsNestedObject: Ecs) => {
  const renderer = getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers });

  const eventKind = getField(getFieldsData('event.kind'));
  const eventKindInECS = eventKind && isEcsAllowedValue('event.kind', eventKind);

  const eventCategories = getFieldArray(getFieldsData('event.category'));
  const eventCategoryInECS = eventCategories.some((category) =>
    isEcsAllowedValue('event.category', category)
  );

  if (eventKind === 'event') {
    return eventCategoryInECS || renderer != null;
  }
  return eventKindInECS || renderer != null;
};

/**
 * Hook to return true if overview should be visible
 */
export const useShowEventOverview = (): boolean => {
  const { getFieldsData, dataAsNestedObject } = useRightPanelContext();
  return useMemo(
    () => showEventOverview(getFieldsData, dataAsNestedObject),
    [getFieldsData, dataAsNestedObject]
  );
};
