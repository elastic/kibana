/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Action } from 'redux';
import { HostIsolationExceptionsPageState } from '../types';

export type HostIsolationExceptionsPageDataChanged =
  Action<'hostIsolationExceptionsPageDataChanged'> & {
    payload: HostIsolationExceptionsPageState['entries'];
  };

export type HostIsolationExceptionsDeleteItem = Action<'hostIsolationExceptionsMarkToDelete'> & {
  payload?: ExceptionListItemSchema;
};

export type HostIsolationExceptionsSubmitDelete = Action<'hostIsolationExceptionsSubmitDelete'>;

export type HostIsolationExceptionsDeleteStatusChanged =
  Action<'hostIsolationExceptionsDeleteStatusChanged'> & {
    payload: HostIsolationExceptionsPageState['deletion']['status'];
  };

export type HostIsolationExceptionsPageAction =
  | HostIsolationExceptionsPageDataChanged
  | HostIsolationExceptionsDeleteItem
  | HostIsolationExceptionsSubmitDelete
  | HostIsolationExceptionsDeleteStatusChanged;
