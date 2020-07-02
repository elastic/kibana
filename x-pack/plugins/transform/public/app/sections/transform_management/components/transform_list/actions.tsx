/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pick } from 'lodash';

import { EuiTableActionsColumnType } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

import { TransformListRow } from '../../../../common';

import { CloneButton } from './action_clone';
import { useDeleteAction, DeleteButton, DeleteButtonModal } from './action_delete';
import { EditTransformFlyout } from '../edit_transform_flyout';
import { useEditAction, EditButton } from './action_edit';
import { useStartAction, StartButton, StartButtonModal } from './action_start';
import { StopButton } from './action_stop';

export const useActions = ({
  forceDisable,
}: {
  forceDisable: boolean;
}): { actions: EuiTableActionsColumnType<TransformListRow>['actions']; modals: JSX.Element } => {
  const deleteAction = useDeleteAction();
  const editAction = useEditAction();
  const startAction = useStartAction();

  return {
    modals: (
      <>
        <StartButtonModal
          {...pick(startAction, ['closeModal', 'isModalVisible', 'items', 'startAndCloseModal'])}
        />
        {editAction.config && editAction.isFlyoutVisible && (
          <EditTransformFlyout closeFlyout={editAction.closeFlyout} config={editAction.config} />
        )}
        <DeleteButtonModal
          {...pick(deleteAction, [
            'closeModal',
            'deleteAndCloseModal',
            'deleteDestIndex',
            'deleteIndexPattern',
            'indexPatternExists',
            'isModalVisible',
            'items',
            'shouldForceDelete',
            'toggleDeleteIndex',
            'toggleDeleteIndexPattern',
            'userCanDeleteIndex',
          ])}
        />
      </>
    ),
    actions: [
      {
        render: (item: TransformListRow) => {
          if (item.stats.state === TRANSFORM_STATE.STOPPED) {
            return (
              <StartButton
                items={[item]}
                forceDisable={forceDisable}
                onClick={startAction.openModal}
              />
            );
          }
          return <StopButton items={[item]} forceDisable={forceDisable} />;
        },
      },
      {
        render: (item: TransformListRow) => {
          return <EditButton config={item.config} onClick={editAction.showFlyout} />;
        },
      },
      {
        render: (item: TransformListRow) => {
          return <CloneButton itemId={item.id} />;
        },
      },
      {
        render: (item: TransformListRow) => {
          return (
            <DeleteButton
              items={[item]}
              forceDisable={forceDisable}
              onClick={deleteAction.openModal}
            />
          );
        },
      },
    ],
  };
};
