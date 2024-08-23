/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
interface DeleteIndexModelProps {
  onCancel: () => void;
  onConfirm: () => void;
  selectedIndexCount?: number;
  indexNames: string[];
}
export const DeleteIndexModal: React.FC<DeleteIndexModelProps> = ({
  onCancel,
  onConfirm,
  selectedIndexCount = 1,
  indexNames,
}) => {
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.modalTitle', {
        defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {# indices} }',
        values: { selectedIndexCount },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      buttonColor="danger"
      confirmButtonDisabled={false}
      cancelButtonText={i18n.translate(
        'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.idxMgmt.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
        {
          defaultMessage: 'Delete {selectedIndexCount, plural, one {index} other {indices} }',
          values: { selectedIndexCount },
        }
      )}
    >
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteDescription"
            defaultMessage="You are about to delete {selectedIndexCount, plural, one {this index} other {these indices} }:"
            values={{ selectedIndexCount }}
          />
        </p>

        <ul>
          {indexNames.map((indexName) => (
            <li key={indexName}>{indexName}</li>
          ))}
        </ul>

        <p>
          <FormattedMessage
            id="xpack.idxMgmt.indexActionsMenu.deleteIndex.deleteWarningDescription"
            defaultMessage="You can't recover a deleted index. Make sure you have appropriate backups."
          />
        </p>
      </Fragment>
    </EuiConfirmModal>
  );
};
