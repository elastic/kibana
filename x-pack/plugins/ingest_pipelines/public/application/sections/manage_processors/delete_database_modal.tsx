/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useKibana } from '../../../shared_imports';
import { GeoipDatabase } from './types';
import {
  DELETE_DATABASE_MODAL_FORM_ID,
  DELETE_DATABASE_MODAL_TITLE_ID,
  deleteDatabaseErrorTitle,
  getDeleteDatabaseSuccessMessage,
} from './constants';

export const DeleteDatabaseModal = ({
  closeModal,
  database,
  reloadDatabases,
}: {
  closeModal: () => void;
  database: GeoipDatabase;
  reloadDatabases: () => void;
}) => {
  const [confirmation, setConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isValid = confirmation === 'delete';
  const { services } = useKibana();
  const onDeleteDatabase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await services.api.deleteGeoipDatabase(database.id);
      setIsLoading(false);
      if (error) {
        services.notifications.toasts.addError(error, {
          title: deleteDatabaseErrorTitle,
        });
      } else {
        services.notifications.toasts.addSuccess(getDeleteDatabaseSuccessMessage(database.name));
        await reloadDatabases();
        closeModal();
      }
    } catch (e) {
      setIsLoading(false);
      services.notifications.toasts.addError(e, {
        title: deleteDatabaseErrorTitle,
      });
    }
  };
  return (
    <EuiModal
      aria-labelledby={DELETE_DATABASE_MODAL_TITLE_ID}
      onClose={closeModal}
      initialFocus="[name=confirmation]"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={DELETE_DATABASE_MODAL_TITLE_ID}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.deleteDatabaseModalTitle"
            defaultMessage="Delete {database}"
            values={{
              database: database.name,
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          id={DELETE_DATABASE_MODAL_FORM_ID}
          component="form"
          onSubmit={(event) => onDeleteDatabase(event)}
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.deleteDatabaseForm.confirmationLabel"
                defaultMessage={'Please type "delete" to confirm.'}
              />
            }
          >
            <EuiFieldText
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.deleteModalCancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          form={DELETE_DATABASE_MODAL_FORM_ID}
          disabled={isLoading || !isValid}
          color="danger"
        >
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addModalConfirmButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
