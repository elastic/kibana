/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, createFilterInActionFactory } from '@kbn/cell-actions';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { fieldHasCellActions } from '../../utils';
import { KibanaServices } from '../../../common/lib/kibana';
import { TimelineId } from '../../../../common/types';
import { isTimelineScope } from '../../../helpers';
import type { SecurityCellAction } from '../../types';

const ID = 'security_filterIn';

export const createFilterInAction = ({
  store,
  order,
}: {
  store: SecurityAppStore;
  order?: number;
}): SecurityCellAction => {
  const {
    data: {
      query: { filterManager },
    },
  } = KibanaServices.get();
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();

  const filterInActionFactory = createFilterInActionFactory({ filterManager });

  return filterInActionFactory<SecurityCellAction>({
    id: ID,
    order,
    isCompatible: async ({ field }) => fieldHasCellActions(field.name),
    execute: async (executionContext) => {
      const { field, metadata } = executionContext;

      if (metadata?.scopeId && isTimelineScope(metadata.scopeId)) {
        const timelineFilterManager = getTimelineById(
          store.getState(),
          TimelineId.active
        )?.filterManager;
        addFilterIn({
          filterManager: timelineFilterManager,
          fieldName: field.name,
          value: field.value,
        });
      } else {
        addFilterIn({ filterManager, fieldName: field.name, value: field.value });
      }
    },
  });
};
