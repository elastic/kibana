/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useActions, useValues } from 'kea';
import { isEmpty } from 'lodash';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { AppLogic } from '../../../app_logic';
import { ContentSection } from '../../../components/shared/content_section';
import { SourceConfigFields } from '../../../components/shared/source_config_fields';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import {
  CANCEL_BUTTON,
  OK_BUTTON,
  CONFIRM_MODAL_TITLE,
  SAVE_CHANGES_BUTTON,
  REMOVE_BUTTON,
} from '../../../constants';
import { SourceDataItem } from '../../../types';
import { AddSourceLogic } from '../components/add_source/add_source_logic';
import {
  SOURCE_SETTINGS_HEADING,
  SOURCE_SETTINGS_TITLE,
  SOURCE_SETTINGS_DESCRIPTION,
  SOURCE_NAME_LABEL,
  SOURCE_CONFIG_TITLE,
  SOURCE_CONFIG_DESCRIPTION,
  SOURCE_CONFIG_LINK,
  SOURCE_REMOVE_TITLE,
  SOURCE_REMOVE_DESCRIPTION,
  SYNC_DIAGNOSTICS_TITLE,
  SYNC_DIAGNOSTICS_DESCRIPTION,
  SYNC_DIAGNOSTICS_BUTTON,
} from '../constants';
import { staticSourceData } from '../source_data';
import { SourceLogic } from '../source_logic';

export const SourceSettings: React.FC = () => {
  const { updateContentSource, removeContentSource } = useActions(SourceLogic);
  const { getSourceConfigData } = useActions(AddSourceLogic);

  const {
    contentSource: { name, id, serviceType },
    buttonLoading,
  } = useValues(SourceLogic);

  const {
    sourceConfigData: { configuredFields },
  } = useValues(AddSourceLogic);

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    getSourceConfigData(serviceType);
  }, []);

  const {
    configuration: { isPublicKey },
    editPath,
  } = staticSourceData.find((source) => source.serviceType === serviceType) as SourceDataItem;

  const [inputValue, setValue] = useState(name);
  const [confirmModalVisible, setModalVisibility] = useState(false);
  const showConfirm = () => setModalVisibility(true);
  const hideConfirm = () => setModalVisibility(false);

  const showConfig = isOrganization && !isEmpty(configuredFields);

  const { clientId, clientSecret, publicKey, consumerKey, baseUrl } = configuredFields || {};

  const diagnosticsPath = isOrganization
    ? `/api/workplace_search/org/sources/${id}/download_diagnostics`
    : `/api/workplace_search/account/sources/${id}/download_diagnostics`;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  const submitNameChange = (e: FormEvent) => {
    e.preventDefault();
    updateContentSource(id, { name: inputValue });
  };

  const handleSourceRemoval = () => {
    /**
     * The modal was just hanging while the UI waited for the server to respond.
     * EuiModal doens't allow the button to have a loading state so we just hide the
     * modal here and set the button that was clicked to delete to a loading state.
     */
    setModalVisibility(false);
    removeContentSource(id);
  };

  const confirmModal = (
    <EuiConfirmModal
      title={CONFIRM_MODAL_TITLE}
      onConfirm={handleSourceRemoval}
      onCancel={hideConfirm}
      buttonColor="danger"
      cancelButtonText={CANCEL_BUTTON}
      confirmButtonText={OK_BUTTON}
      defaultFocusedButton="confirm"
    >
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.sources.settingsModal.text"
        defaultMessage="Your source documents will be deleted from Workplace Search.{lineBreak}Are you sure you want to remove {name}?"
        values={{
          name,
          lineBreak: <br />,
        }}
      />
    </EuiConfirmModal>
  );

  return (
    <>
      <ViewContentHeader title={SOURCE_SETTINGS_HEADING} />
      <ContentSection title={SOURCE_SETTINGS_TITLE} description={SOURCE_SETTINGS_DESCRIPTION}>
        <form onSubmit={submitNameChange}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormRow>
                <EuiFieldText
                  value={inputValue}
                  size={64}
                  onChange={handleNameChange}
                  aria-label={SOURCE_NAME_LABEL}
                  disabled={buttonLoading}
                  data-test-subj="SourceNameInput"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={buttonLoading}
                color="primary"
                onClick={submitNameChange}
                data-test-subj="SaveChangesButton"
              >
                {SAVE_CHANGES_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </form>
      </ContentSection>
      {showConfig && (
        <ContentSection title={SOURCE_CONFIG_TITLE} description={SOURCE_CONFIG_DESCRIPTION}>
          <SourceConfigFields
            clientId={clientId}
            clientSecret={clientSecret}
            publicKey={isPublicKey ? publicKey : undefined}
            consumerKey={consumerKey || undefined}
            baseUrl={baseUrl}
          />
          <EuiFormRow>
            <Link to={editPath}>
              <EuiButtonEmpty flush="left">{SOURCE_CONFIG_LINK}</EuiButtonEmpty>
            </Link>
          </EuiFormRow>
        </ContentSection>
      )}
      <ContentSection title={SYNC_DIAGNOSTICS_TITLE} description={SYNC_DIAGNOSTICS_DESCRIPTION}>
        <EuiButton
          target="_blank"
          href={diagnosticsPath}
          isLoading={buttonLoading}
          data-test-subj="DownloadDiagnosticsButton"
          download
        >
          {SYNC_DIAGNOSTICS_BUTTON}
        </EuiButton>
      </ContentSection>
      <ContentSection title={SOURCE_REMOVE_TITLE} description={SOURCE_REMOVE_DESCRIPTION}>
        <EuiButton
          isLoading={buttonLoading}
          data-test-subj="DeleteSourceButton"
          fill
          color="danger"
          onClick={showConfirm}
        >
          {REMOVE_BUTTON}
        </EuiButton>
        {confirmModalVisible && confirmModal}
      </ContentSection>
    </>
  );
};
