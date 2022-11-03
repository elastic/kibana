/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import type { BulkActionsObjectProp, HeaderActionProps } from '../../../../../common/types';
import type { AlertWorkflowStatus } from '../../../types';

export type OnUpdateAlertStatusSuccess = (
  updated: number,
  conflicts: number,
  status: AlertWorkflowStatus
) => void;
export type OnUpdateAlertStatusError = (status: AlertWorkflowStatus, error: Error) => void;

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;

export type BulkActionsProp = boolean | BulkActionsObjectProp;
