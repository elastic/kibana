/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from 'kibana/public';

export interface ArtifactListPageUrlParams {
  page?: number;
  perPage?: number; // FIXME:PT change to `pageSize` to be consistent
  filter?: string;
  includedPolicies?: string;
  show?: 'create' | 'edit';
  itemId?: string;
  sortField?: string;
  sortOrder?: string;
}

export interface ArtifactFormComponentProps {
  item: object; // FIXME:PT should be a type? and optional?
  mode: 'edit' | 'create';
  /** signals that the form should be made disabled (ex. while an update/create api call is in flight) */
  disabled: boolean;
  /** Error will be set if the submission of the form to the api results in an API error. Form can use it to provide feedback to the user */
  error: HttpFetchError | undefined;

  /** reports the state of the form data and the current updated item */
  onChange(formStatus: ArtifactFormComponentOnChangeCallbackProps): void;
}

export interface ArtifactFormComponentOnChangeCallbackProps {
  isValid: boolean;
  item: object;
}
