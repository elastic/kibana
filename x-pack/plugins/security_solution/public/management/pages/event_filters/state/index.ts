/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '../../../../shared_imports';
import { AsyncResourceState } from '../../../state/async_resource_state';
import { FoundExceptionListItemSchema } from '../../../../../../lists/common/schemas';
import {
  EventFiltersForm,
  EventFiltersPageLocation,
  EventFiltersServiceGetListOptions,
} from '../types';

export interface EventFiltersListPageState {
  entries: ExceptionListItemSchema[];
  form: EventFiltersForm;
  location: EventFiltersPageLocation;
  /** State for the Event Filters List page */
  listPage: {
    active: boolean;
    forceRefresh: boolean;
    data: AsyncResourceState<{
      /** The query that was used to retrieve the data */
      query: EventFiltersServiceGetListOptions;
      /** The data retrieved from the API */
      content: FoundExceptionListItemSchema;
    }>;
    /** tracks if the overall list (not filtered or with invalid page numbers) contains data */
    dataExist: AsyncResourceState<boolean>;
  };
}
