/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getField, getFieldArray } from '../../shared/utils';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { getRowRenderer } from '../../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { defaultRowRenderers } from '../../../../timelines/components/timeline/body/renderers';
import { isEcsAllowedValue } from '../utils/event_utils';
import { EventKind } from '../../shared/constants/event_kinds';

export interface UseShowEventOverviewParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
}

/**
 * Hook used on the right panel to decide if the flyout has an expanded section.
 * This also helps deciding if the overview section should be displayed.
 * The hook looks at the `event.kind` and `event.category` fields of the document.
 */
export const useFlyoutIsExpandable = ({
  getFieldsData,
  dataAsNestedObject,
}: UseShowEventOverviewParams): boolean => {
  const renderer = getRowRenderer({ data: dataAsNestedObject, rowRenderers: defaultRowRenderers });

  const eventKind = getField(getFieldsData('event.kind'));
  const eventKindInECS = eventKind && isEcsAllowedValue('event.kind', eventKind);

  const eventCategories = getFieldArray(getFieldsData('event.category'));
  const eventCategoryInECS = eventCategories.some((category) =>
    isEcsAllowedValue('event.category', category)
  );

  return useMemo(() => {
    // alert document: always show overview
    if (eventKind === EventKind.signal) {
      return true;
    }
    // event document: show overview when event category is ecs compliant or event renderer is available
    if (eventKind === EventKind.event) {
      return eventCategoryInECS || renderer != null;
    }
    // non-event document: show overview when event kind is ecs compliant or event renderer is available
    return eventKindInECS || renderer != null;
  }, [eventKind, eventCategoryInECS, eventKindInECS, renderer]);
};
