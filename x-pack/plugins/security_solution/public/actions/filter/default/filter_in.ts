/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SecurityAppStore } from '../../../common/store';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { fieldHasCellActions } from '../../utils';
import { KibanaServices } from '../../../common/lib/kibana';
import { TimelineId } from '../../../../common/types';
import {
  createFilterInAction as createGenericFilterInAction,
  addFilterIn,
} from '../generic/filter_in';
import { isTimelineScope } from '../../../helpers';
import type { SecurityCellAction } from '../../types';

export const FILTER_IN = i18n.translate('xpack.securitySolution.actions.filterIn', {
  defaultMessage: 'Filter In',
});
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
  const genericFilterIn = createGenericFilterInAction({ order, filterManager });

  return {
    ...genericFilterIn,
    id: ID,
    isCompatible: async ({ field }) => fieldHasCellActions(field.name),
    execute: async (executionContext) => {
      const { field, metadata } = executionContext;

      if (metadata?.scopeId && isTimelineScope(metadata.scopeId)) {
        const timelineFilterManager = getTimelineById(
          store.getState(),
          TimelineId.active
        )?.filterManager;
        addFilterIn(field.name, field.value, timelineFilterManager);
      } else {
        genericFilterIn.execute(executionContext);
      }
    },
  };
};
