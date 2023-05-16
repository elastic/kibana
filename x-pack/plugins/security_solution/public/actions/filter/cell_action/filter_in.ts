/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addFilterIn, addFilterOut, createFilterInActionFactory } from '@kbn/cell-actions';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { fieldHasCellActions } from '../../utils';
import { TimelineId } from '../../../../common/types';
import { isTimelineScope } from '../../../helpers';
import { SecurityCellActionType } from '../../constants';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';

export const createFilterInCellActionFactory = ({
  store,
  services,
}: {
  store: SecurityAppStore;
  services: StartServices;
}) => {
  const getTimelineById = timelineSelectors.getTimelineByIdSelector();

  const { filterManager } = services.data.query;
  const genericFilterInActionFactory = createFilterInActionFactory({ filterManager });

  return genericFilterInActionFactory.combine<SecurityCellAction>({
    type: SecurityCellActionType.FILTER,
    isCompatible: async ({ field }) => fieldHasCellActions(field.name),
    execute: async ({ field, value, metadata }) => {
      // if negateFilters is true we have to perform the opposite operation, we can just execute filterOut with the same params
      const addFilter = metadata?.negateFilters === true ? addFilterOut : addFilterIn;

      if (metadata?.scopeId && isTimelineScope(metadata.scopeId)) {
        const timelineFilterManager = getTimelineById(
          store.getState(),
          TimelineId.active
        )?.filterManager;

        addFilter({
          filterManager: timelineFilterManager,
          fieldName: field.name,
          value,
        });
      } else {
        addFilter({
          filterManager,
          fieldName: field.name,
          value,
        });
      }
    },
  });
};
