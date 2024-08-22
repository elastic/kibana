/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { GeoipDatabase } from './types';
import { useKibana } from '../../../shared_imports';
import {
  ADD_DATABASE_MODAL_TITLE_ID,
  ADD_DATABASE_MODAL_FORM_ID,
  DATABASE_NAME_OPTIONS,
  getAddDatabaseSuccessMessage,
  addDatabaseErrorTitle,
} from './constants';
export const AddDatabaseModal = ({
  closeModal,
  reloadDatabases,
  databases,
}: {
  closeModal: () => void;
  reloadDatabases: () => void;
  databases: GeoipDatabase[];
}) => {
  const [maxmind, setMaxmind] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [nameExistsError, setDatabaseExistsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const existingDatabaseNames = useMemo(
    () => databases.map((database) => database.name),
    [databases]
  );
  const { services } = useKibana();
  const onDatabaseNameChange = (value: string) => {
    setDatabaseName(value);
    setDatabaseExistsError(existingDatabaseNames.includes(value));
  };
  const isValid = maxmind && databaseName && !nameExistsError;

  const onAddDatabase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await services.api.createGeoipDatabase({ maxmind, databaseName });
      if (error) {
        services.notifications.toasts.addError(error, {
          title: addDatabaseErrorTitle,
        });
      } else {
        services.notifications.toasts.addSuccess(getAddDatabaseSuccessMessage(databaseName));
        await reloadDatabases();
        closeModal();
      }
    } catch (e) {
      services.notifications.toasts.addError(e, {
        title: addDatabaseErrorTitle,
      });
    }
    setIsLoading(false);
  };
  return (
    <EuiModal
      aria-labelledby={ADD_DATABASE_MODAL_TITLE_ID}
      onClose={closeModal}
      initialFocus="[name=maxmind]"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={ADD_DATABASE_MODAL_TITLE_ID}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseModalTitle"
            defaultMessage="Add database"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutTitle"
              defaultMessage="Add MaxMind license key to keystore"
            />
          }
          iconType="iInCircle"
        >
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.licenseCalloutText"
              defaultMessage="In order to grant access to your MaxMind account, you must add the license key to the keystore. {link}"
              values={{
                link: (
                  <EuiLink href="#">
                    <FormattedMessage
                      id="xpack.ingestPipelines.manageProcessors.geoip.licenseLearnMoreLink"
                      defaultMessage="Learn more."
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiForm
          id={ADD_DATABASE_MODAL_FORM_ID}
          component="form"
          onSubmit={(event) => onAddDatabase(event)}
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.maxMindInputLabel"
                defaultMessage="MaxMind Account ID"
              />
            }
          >
            <EuiFieldText
              name="maxmind"
              value={maxmind}
              onChange={(e) => setMaxmind(e.target.value)}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseNameSelectLabel"
                defaultMessage="Database name"
              />
            }
          >
            <EuiSelect
              options={DATABASE_NAME_OPTIONS}
              hasNoInitialSelection={true}
              value={databaseName}
              onChange={(e) => onDatabaseNameChange(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>

        {nameExistsError && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.nameExistsErrorTitle"
                  defaultMessage="Database already exists"
                />
              }
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.nameExistsErrorText"
                  defaultMessage="Database with name {name} already exists. Select a different database name."
                  values={{
                    name: databaseName,
                  }}
                />
              </p>
            </EuiCallOut>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addModalCancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          fill
          type="submit"
          form={ADD_DATABASE_MODAL_FORM_ID}
          disabled={isLoading || !isValid}
        >
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.addModalConfirmButtonLabel"
            defaultMessage="Add database"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
