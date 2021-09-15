/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { AsyncResourceState } from '../../state/async_resource_state';

export interface HostIsolationExceptionsPageState {
  entries?: FoundExceptionListItemSchema;
  /** State for the Event Filters List page */
  listPage: {
    active: boolean;
    forceRefresh: boolean;
    data: AsyncResourceState<[]>;
    /** tracks if the overall list (not filtered or with invalid page numbers) contains data */
    dataExist: AsyncResourceState<boolean>;
    /** state for deletion of items from the list */
    deletion: {
      item: ExceptionListItemSchema | undefined;
      status: AsyncResourceState<ExceptionListItemSchema>;
    };
  };
}
