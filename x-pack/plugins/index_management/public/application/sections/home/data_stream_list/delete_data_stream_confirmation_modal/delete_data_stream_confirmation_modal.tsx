/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiConfirmModal, EuiOverlayMask, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { deleteDataStreams } from '../../../../services/api';
import { notificationService } from '../../../../services/notification';

interface Props {
  dataStreams: string[];
  onClose: (data?: { hasDeletedDataStreams: boolean }) => void;
}

export const DeleteDataStreamConfirmationModal: React.FunctionComponent<Props> = ({
  dataStreams,
  onClose,
}: {
  dataStreams: string[];
  onClose: (data?: { hasDeletedDataStreams: boolean }) => void;
}) => {
  const dataStreamsCount = dataStreams.length;

  const handleDeleteDataStreams = () => {
    deleteDataStreams(dataStreams).then(({ data: { dataStreamsDeleted, errors }, error }) => {
      const hasDeletedDataStreams = dataStreamsDeleted && dataStreamsDeleted.length;

      if (hasDeletedDataStreams) {
        const successMessage =
          dataStreamsDeleted.length === 1
            ? i18n.translate(
                'xpack.idxMgmt.deleteDataStreamsConfirmationModal.successDeleteSingleNotificationMessageText',
                {
                  defaultMessage: "Deleted data stream '{dataStreamName}'",
                  values: { dataStreamName: dataStreams[0] },
                }
              )
            : i18n.translate(
                'xpack.idxMgmt.deleteDataStreamsConfirmationModal.successDeleteMultipleNotificationMessageText',
                {
                  defaultMessage:
                    'Deleted {numSuccesses, plural, one {# data stream} other {# data streams}}',
                  values: { numSuccesses: dataStreamsDeleted.length },
                }
              );

        onClose({ hasDeletedDataStreams });
        notificationService.showSuccessToast(successMessage);
      }

      if (error || (errors && errors.length)) {
        const hasMultipleErrors =
          (errors && errors.length > 1) || (error && dataStreams.length > 1);

        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.idxMgmt.deleteDataStreamsConfirmationModal.multipleErrorsNotificationMessageText',
              {
                defaultMessage: 'Error deleting {count} data streams',
                values: {
                  count: (errors && errors.length) || dataStreams.length,
                },
              }
            )
          : i18n.translate(
              'xpack.idxMgmt.deleteDataStreamsConfirmationModal.errorNotificationMessageText',
              {
                defaultMessage: "Error deleting data stream '{name}'",
                values: { name: (errors && errors[0].name) || dataStreams[0] },
              }
            );

        notificationService.showDangerToast(errorMessage);
      }
    });
  };

  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        buttonColor="danger"
        data-test-subj="deleteDataStreamsConfirmation"
        title={
          <FormattedMessage
            id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.modalTitleText"
            defaultMessage="Delete {dataStreamsCount, plural, one {data stream} other {# data streams}}"
            values={{ dataStreamsCount }}
          />
        }
        onCancel={() => onClose()}
        onConfirm={handleDeleteDataStreams}
        cancelButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.confirmButtonLabel"
            defaultMessage="Delete {dataStreamsCount, plural, one {data stream} other {data streams} }"
            values={{ dataStreamsCount }}
          />
        }
      >
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.warningTitle"
                defaultMessage="Deleting data streams also deletes indices"
              />
            }
            color="danger"
            iconType="alert"
          >
            <p>
              <FormattedMessage
                id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.warningMessage"
                defaultMessage="Data streams are collections of time series indices. Deleting a data stream will also delete its indices."
              />
            </p>
          </EuiCallOut>

          <EuiSpacer />

          <p>
            <FormattedMessage
              id="xpack.idxMgmt.deleteDataStreamsConfirmationModal.deleteDescription"
              defaultMessage="You are about to delete {dataStreamsCount, plural, one {this data stream} other {these data streams} }:"
              values={{ dataStreamsCount }}
            />
          </p>

          <ul>
            {dataStreams.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </Fragment>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
