/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType } from 'react';
import type { HeaderActionProps } from '../../../../../common/types';
import type { TimelineItem } from '../../../../../common/search_strategy/timeline/events/all';
import type { AlertWorkflowStatus } from '../../../types';

export type OnUpdateAlertStatusSuccess = (
  updated: number,
  conflicts: number,
  status: AlertWorkflowStatus
) => void;
export type OnUpdateAlertStatusError = (status: AlertWorkflowStatus, error: Error) => void;

export interface CustomBulkAction {
  key: string;
  label: string;
  disableOnQuery?: boolean;
  disabledLabel?: string;
  onClick: (items?: TimelineItem[]) => void;
  ['data-test-subj']?: string;
}

export type CustomBulkActionProp = Omit<CustomBulkAction, 'onClick'> & {
  onClick: (eventIds: string[]) => void;
};

export type HeaderCellRender = ComponentType | ComponentType<HeaderActionProps>;

export interface BulkActionsObjectProp {
  alertStatusActions?: boolean;
  onAlertStatusActionSuccess?: OnUpdateAlertStatusSuccess;
  onAlertStatusActionFailure?: OnUpdateAlertStatusError;
  customBulkActions?: CustomBulkAction[];
}
export type BulkActionsProp = boolean | BulkActionsObjectProp;
