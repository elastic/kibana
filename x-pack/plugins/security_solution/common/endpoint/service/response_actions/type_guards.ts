/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionDetails,
  MaybeImmutable,
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters,
  ResponseActionUploadOutputContent,
  ResponseActionUploadParameters,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
} from '../../types';

type SomeObjectWithCommand = Pick<ActionDetails, 'command'>;

export const isUploadAction = (
  action: MaybeImmutable<SomeObjectWithCommand>
): action is ActionDetails<ResponseActionUploadOutputContent, ResponseActionUploadParameters> => {
  return action.command === 'upload';
};

export const isExecuteAction = (
  action: MaybeImmutable<SomeObjectWithCommand>
): action is ActionDetails<
  ResponseActionExecuteOutputContent,
  ResponseActionsExecuteParameters
> => {
  return action.command === 'execute';
};

export const isGetFileAction = (
  action: MaybeImmutable<SomeObjectWithCommand>
): action is ActionDetails<ResponseActionGetFileOutputContent, ResponseActionGetFileParameters> => {
  return action.command === 'get-file';
};
