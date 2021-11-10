/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Action } from 'redux';
import { HostIsolationExceptionsPageState } from '../types';

export type HostIsolationExceptionsFormStateChanged =
  Action<'hostIsolationExceptionsFormStateChanged'> & {
    payload: HostIsolationExceptionsPageState['form']['status'];
  };

export type HostIsolationExceptionsFormEntryChanged =
  Action<'hostIsolationExceptionsFormEntryChanged'> & {
    payload: HostIsolationExceptionsPageState['form']['entry'];
  };

export type HostIsolationExceptionsCreateEntry = Action<'hostIsolationExceptionsCreateEntry'> & {
  payload: HostIsolationExceptionsPageState['form']['entry'];
};

export type HostIsolationExceptionsMarkToEdit = Action<'hostIsolationExceptionsMarkToEdit'> & {
  payload: {
    id: string;
  };
};

export type HostIsolationExceptionsSubmitEdit = Action<'hostIsolationExceptionsSubmitEdit'> & {
  payload: UpdateExceptionListItemSchema;
};

export type HostIsolationExceptionsPageAction =
  | HostIsolationExceptionsCreateEntry
  | HostIsolationExceptionsFormStateChanged
  | HostIsolationExceptionsFormEntryChanged
  | HostIsolationExceptionsMarkToEdit
  | HostIsolationExceptionsSubmitEdit;
