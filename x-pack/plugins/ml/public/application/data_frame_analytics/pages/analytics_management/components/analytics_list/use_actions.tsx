/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pick } from 'lodash';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import { CloneButton } from '../action_clone';
import { useDeleteAction, DeleteButton, DeleteButtonModal } from '../action_delete';
import { useStartAction, StartButton, StartButtonModal } from '../action_start';
import { StopButton } from '../action_stop';
import { getViewAction } from '../action_view';

import { isDataFrameAnalyticsRunning, DataFrameAnalyticsListRow } from './common';

export const useActions = (
  createAnalyticsForm: CreateAnalyticsFormProps,
  isManagementTable: boolean
): {
  actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'];
  modals: JSX.Element | null;
} => {
  const deleteAction = useDeleteAction();
  const startAction = useStartAction();

  let modals: JSX.Element | null = null;

  const actions: EuiTableActionsColumnType<DataFrameAnalyticsListRow>['actions'] = [
    getViewAction(isManagementTable),
  ];

  if (isManagementTable === false) {
    modals = (
      <>
        <StartButtonModal
          {...pick(startAction, ['closeModal', 'isModalVisible', 'item', 'startAndCloseModal'])}
        />
        <DeleteButtonModal
          {...pick(deleteAction, [
            'closeModal',
            'deleteAndCloseModal',
            'deleteTargetIndex',
            'deleteIndexPattern',
            'indexPatternExists',
            'isModalVisible',
            'item',
            'toggleDeleteIndex',
            'toggleDeleteIndexPattern',
            'userCanDeleteIndex',
          ])}
        />
      </>
    );
    actions.push(
      ...[
        {
          render: (item: DataFrameAnalyticsListRow) => {
            if (!isDataFrameAnalyticsRunning(item.stats.state)) {
              return <StartButton item={item} onClick={startAction.openModal} />;
            }
            return <StopButton item={item} />;
          },
        },
        {
          render: (item: DataFrameAnalyticsListRow) => {
            return <DeleteButton item={item} onClick={deleteAction.openModal} />;
          },
        },
        {
          render: (item: DataFrameAnalyticsListRow) => {
            return <CloneButton item={item} createAnalyticsForm={createAnalyticsForm} />;
          },
        },
      ]
    );
  }

  return { actions, modals };
};
