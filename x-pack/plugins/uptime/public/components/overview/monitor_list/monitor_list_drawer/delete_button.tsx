/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteMonitor } from '../../../../state/actions/central_management';
import { DeleteModal } from './delete_modal';

interface DeleteButtonProps {
  monitorId: string;
  monitorName: string;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ monitorId, monitorName }) => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const dispatch = useDispatch();
  let deleteModal: JSX.Element | undefined;
  if (isModalVisible) {
    deleteModal = (
      <DeleteModal
        closeModal={() => setIsModalVisible(false)}
        deleteMonitor={() => dispatch(deleteMonitor(monitorId))}
        monitorName={monitorName}
      />
    );
  }
  return (
    <DeleteButtonComponent
      deleteModal={deleteModal}
      monitorName={monitorName}
      setIsModalVisible={() => setIsModalVisible(true)}
    />
  );
};

interface DeleteButtonComponentProps {
  deleteModal: JSX.Element | undefined;
  monitorName: string;
  setIsModalVisible: () => void;
}

const DeleteButtonComponent: React.FC<DeleteButtonComponentProps> = ({
  deleteModal,
  monitorName,
  setIsModalVisible,
}) => {
  return (
    <>
      <EuiButtonEmpty
        aria-label={i18n.translate('xpack.uptime.monitorListDrawer.deleteButton.ariaLabel', {
          defaultMessage: 'Delete monitor with name {monitorName}',
          values: { monitorName },
        })}
        onClick={setIsModalVisible}
      >
        <FormattedMessage
          id="xpack.uptime.monitorListDrawer.deleteButton.content"
          defaultMessage="Delete"
        />
      </EuiButtonEmpty>
      {deleteModal}
    </>
  );
};
