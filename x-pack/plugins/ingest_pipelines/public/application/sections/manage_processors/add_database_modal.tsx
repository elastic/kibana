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
import { css } from '@emotion/react';
import type { GeoipDatabase } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import {
  ADD_DATABASE_MODAL_TITLE_ID,
  ADD_DATABASE_MODAL_FORM_ID,
  DATABASE_TYPE_OPTIONS,
  GEOIP_NAME_OPTIONS,
  IPINFO_NAME_OPTIONS,
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
  const [databaseType, setDatabaseType] = useState<string | undefined>(undefined);
  const [maxmind, setMaxmind] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [nameExistsError, setNameExistsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const existingDatabaseNames = useMemo(
    () => databases.map((database) => database.name),
    [databases]
  );
  const { services } = useKibana();
  const onDatabaseNameChange = (value: string) => {
    setDatabaseName(value);
    setNameExistsError(existingDatabaseNames.includes(value));
  };
  const isFormValid = (): boolean => {
    if (!databaseType || nameExistsError) {
      return false;
    }
    if (databaseType === 'maxmind') {
      return Boolean(maxmind) && Boolean(databaseName);
    }
    return Boolean(databaseName);
  };
  const onDatabaseTypeChange = (value: string) => {
    setDatabaseType(value);
  };
  const onAddDatabase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid()) {
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await services.api.createGeoipDatabase({
        databaseType,
        databaseName,
        maxmind,
      });
      setIsLoading(false);
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
      setIsLoading(false);
      services.notifications.toasts.addError(e, {
        title: addDatabaseErrorTitle,
      });
    }
  };

  return (
    <EuiModal
      css={css`
        width: 500px;
      `}
      aria-labelledby={ADD_DATABASE_MODAL_TITLE_ID}
      onClose={closeModal}
      initialFocus={'[data-test-subj="datanaseTypeSelect"]'}
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
        <EuiForm
          fullWidth={true}
          id={ADD_DATABASE_MODAL_FORM_ID}
          component="form"
          onSubmit={(event) => onAddDatabase(event)}
        >
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseTypeSelectLabel"
                defaultMessage="Type"
              />
            }
          >
            <EuiSelect
              options={DATABASE_TYPE_OPTIONS}
              hasNoInitialSelection={true}
              value={databaseType}
              onChange={(e) => onDatabaseTypeChange(e.target.value)}
              data-test-subj="datanaseTypeSelect"
            />
          </EuiFormRow>
          {databaseType && (
            <>
              <EuiSpacer />
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
            </>
          )}

          {databaseType === 'maxmind' && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.maxMindInputLabel"
                  defaultMessage="MaxMind Account ID"
                />
              }
            >
              <EuiFieldText
                value={maxmind}
                onChange={(e) => setMaxmind(e.target.value)}
                data-test-subj="maxmindField"
              />
            </EuiFormRow>
          )}
          {databaseType && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseForm.databaseNameSelectLabel"
                  defaultMessage="Database name"
                />
              }
            >
              <EuiSelect
                options={databaseType === 'maxmind' ? GEOIP_NAME_OPTIONS : IPINFO_NAME_OPTIONS}
                hasNoInitialSelection={true}
                value={databaseName}
                onChange={(e) => onDatabaseNameChange(e.target.value)}
                data-test-subj="databaseNameSelect"
              />
            </EuiFormRow>
          )}
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
          disabled={isLoading || !isFormValid()}
          data-test-subj="addGeoipDatabaseSubmit"
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
