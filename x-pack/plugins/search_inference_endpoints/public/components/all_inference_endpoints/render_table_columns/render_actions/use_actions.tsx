/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableComputedColumnType } from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { InferenceEndpointUI } from '../../types';
import { useCopyIDAction } from './actions/copy_id/use_copy_id_action';
import { ConfirmDeleteEndpointModal } from './actions/delete/confirm_delete_endpoint';
import { useDeleteAction } from './actions/delete/use_delete_action';

export const ActionColumn: React.FC<{ interfaceEndpoint: InferenceEndpointUI }> = ({
  interfaceEndpoint,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const tooglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const copyIDAction = useCopyIDAction({
    onActionSuccess: closePopover,
  });

  const deleteAction = useDeleteAction({
    onActionSuccess: closePopover,
  });

  const items = [
    copyIDAction.getAction(interfaceEndpoint),
    deleteAction.getAction(interfaceEndpoint),
  ];

  return (
    <>
      <EuiPopover
        button={
          <EuiButtonIcon
            onClick={tooglePopover}
            iconType="boxesHorizontal"
            aria-label={'Actions'}
            color="text"
            disabled={false}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
      {deleteAction.isModalVisible ? (
        <ConfirmDeleteEndpointModal
          onCancel={deleteAction.onCloseModal}
          onConfirm={deleteAction.onConfirmDeletion}
        />
      ) : null}
    </>
  );
};

interface UseBulkActionsReturnValue {
  actions: EuiTableComputedColumnType<InferenceEndpointUI>;
}

export const useActions = (): UseBulkActionsReturnValue => {
  return {
    actions: {
      align: 'right',
      render: (interfaceEndpoint: InferenceEndpointUI) => {
        return <ActionColumn interfaceEndpoint={interfaceEndpoint} />;
      },
      width: '165px',
    },
  };
};
