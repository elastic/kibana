/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from 'kibana/public';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { PolicyData } from '../../../../common/endpoint/types';

export interface ArtifactListPageUrlParams {
  /** The page number for the list. Must be 1 based. */
  page?: number;
  pageSize?: number;
  filter?: string;
  includedPolicies?: string;
  show?: 'create' | 'edit';
  itemId?: string;
}

export interface ArtifactFormComponentProps {
  item: ExceptionListItemSchema | CreateExceptionListItemSchema;
  mode: 'edit' | 'create';
  /** signals that the form should be made disabled (ex. while an update/create api call is in flight) */
  disabled: boolean;
  /** Error will be set if the submission of the form to the api results in an API error. Form can use it to provide feedback to the user */
  error: HttpFetchError | undefined;

  policies: PolicyData[];
  policiesIsLoading: boolean;

  /** reports the state of the form data and the current updated item */
  onChange(formStatus: ArtifactFormComponentOnChangeCallbackProps): void;
}

export interface ArtifactFormComponentOnChangeCallbackProps {
  isValid: boolean;
  item: ExceptionListItemSchema | CreateExceptionListItemSchema;
}
