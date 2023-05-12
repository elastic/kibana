/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, addFilterOut, createFilterOutActionFactory } from '@kbn/cell-actions';
import { fieldHasCellActions } from '../../utils';
import type { SecurityAppStore } from '../../../common/store';
import type { StartServices } from '../../../types';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { TimelineId } from '../../../../common/types';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

export const createFilterOutCellActionFactory = ({
  store,
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}) => {
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();

  const { filterManager } = services.data.query;
  const genericFilterOutActionFactory = createFilterOutActionFactory({ filterManager });

  return genericFilterOutActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ field }) => fieldHasCellActions(field.name),
    execute: async ({ field, metadata }) => {
      // if negateFilters is true we have to perform the opposite operation, we can just execute filterIn with the same params
      const addFilter = metadata?.negateFilters === true ? addFilterIn : addFilterOut;
      const timeline = getTimelineById(store.getState(), TimelineId.active);

      if (timeline.show) {
        // if the timeline is open, we add the filter directly to the timeline
        addFilter({
          filterManager: timeline.filterManager,
          fieldName: field.name,
          value: field.value,
        });
      } else {
        addFilter({
          filterManager,
          fieldName: field.name,
          value: field.value,
        });
      }
    },
  });
};
