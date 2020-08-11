/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiTableComputedColumnType } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

import { TransformListRow } from '../../../../common';

import { CloneButton } from '../action_clone';
import { useDeleteAction, DeleteButton, DeleteButtonModal } from '../action_delete';
import { EditTransformFlyout } from '../edit_transform_flyout';
import { useEditAction, EditButton } from '../action_edit';
import { useStartAction, StartButton, StartButtonModal } from '../action_start';
import { StopButton } from '../action_stop';

export const useActions = ({
  forceDisable,
}: {
  forceDisable: boolean;
}): { actions: Array<EuiTableComputedColumnType<TransformListRow>>; modals: JSX.Element } => {
  const deleteAction = useDeleteAction();
  const editAction = useEditAction();
  const startAction = useStartAction();

  return {
    modals: (
      <>
        {startAction.isModalVisible && <StartButtonModal {...startAction} />}
        {editAction.config && editAction.isFlyoutVisible && (
          <EditTransformFlyout closeFlyout={editAction.closeFlyout} config={editAction.config} />
        )}
        {deleteAction.isModalVisible && <DeleteButtonModal {...deleteAction} />}
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
          return <EditButton onClick={() => editAction.showFlyout(item.config)} />;
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
