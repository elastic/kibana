/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiForm,
  EuiSpacer,
  EuiFilePicker,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SAVE_BUTTON_LABEL } from '../../../../shared/constants';

import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { AppLogic } from '../../../app_logic';
import { ContentSection } from '../../../components/shared/content_section';
import { SourceConfigFields } from '../../../components/shared/source_config_fields';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import {
  NAV,
  GITHUB_VIA_APP_SERVICE_TYPE,
  GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE,
} from '../../../constants';

import {
  CANCEL_BUTTON,
  OK_BUTTON,
  CONFIRM_MODAL_TITLE,
  SAVE_CHANGES_BUTTON,
  REMOVE_BUTTON,
} from '../../../constants';
import { getEditPath } from '../../../routes';
import { handlePrivateKeyUpload } from '../../../utils';

import {
  SOURCE_SETTINGS_HEADING,
  SOURCE_SETTINGS_TITLE,
  SOURCE_SETTINGS_DESCRIPTION,
  SOURCE_NAME_LABEL,
  SOURCE_CONFIG_TITLE,
  SOURCE_CONFIG_LINK,
  SOURCE_REMOVE_TITLE,
  SOURCE_REMOVE_DESCRIPTION,
  SYNC_DIAGNOSTICS_TITLE,
  SYNC_DIAGNOSTICS_DESCRIPTION,
  SYNC_DIAGNOSTICS_BUTTON,
} from '../constants';
import { SourceLogic } from '../source_logic';

import { AddSourceLogic } from './add_source/add_source_logic';

import { DownloadDiagnosticsButton } from './download_diagnostics_button';

import { SourceLayout } from './source_layout';

export const SourceSettings: React.FC = () => {
  const {
    updateContentSource,
    removeContentSource,
    setStagedPrivateKey,
    updateContentSourceConfiguration,
  } = useActions(SourceLogic);

  const {
    contentSource: { name, id, serviceType, isOauth1, secret },
    buttonLoading,
    stagedPrivateKey,
    isConfigurationUpdateButtonLoading,
  } = useValues(SourceLogic);

  // Even though SourceLogic.values.contentSource.serviceType is retrieved async
  // by SourceLogic, it will always be defined by the time this view is rendered
  // because it is not displayed until SourceLogic has retrieved the content source and
  // SourceLogic.values.dataLoading === false
  const addSourceLogic = AddSourceLogic({ serviceType });
  const { getSourceConfigData } = useActions(addSourceLogic);

  const { sourceConfigData, dataLoading } = useValues(addSourceLogic);

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    getSourceConfigData();
  }, []);

  const isGithubApp =
    serviceType === GITHUB_VIA_APP_SERVICE_TYPE ||
    serviceType === GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE;

  const isCustomSource = serviceType === 'custom';

  const editPath = isGithubApp
    ? undefined // undefined for GitHub apps, as they are configured source-wide, and don't use a connector where you can edit the configuration
    : getEditPath(serviceType);

  const [inputValue, setValue] = useState(name);
  const [confirmModalVisible, setModalVisibility] = useState(false);
  const showConfirm = () => setModalVisibility(true);
  const hideConfirm = () => setModalVisibility(false);

  const showSourceConfig = !isGithubApp && !isCustomSource && isOrganization;
  const showGithubAppConfig = isGithubApp;

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  const submitNameChange = (e: FormEvent) => {
    e.preventDefault();
    updateContentSource(id, { name: inputValue });
  };

  const submitConfigurationChange = (e: FormEvent) => {
    e.preventDefault();
    updateContentSourceConfiguration(id, { private_key: stagedPrivateKey });
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
    <SourceLayout
      pageChrome={[NAV.SETTINGS]}
      pageViewTelemetry="source_settings"
      isLoading={dataLoading}
    >
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
      {showSourceConfig && (
        <ContentSection title={SOURCE_CONFIG_TITLE}>
          <SourceConfigFields isOauth1={isOauth1} sourceConfigData={sourceConfigData} />
          <EuiFormRow>
            <EuiButtonEmptyTo to={editPath as string} flush="left">
              {SOURCE_CONFIG_LINK}
            </EuiButtonEmptyTo>
          </EuiFormRow>
        </ContentSection>
      )}
      {showGithubAppConfig && (
        <ContentSection title={SOURCE_CONFIG_TITLE}>
          <EuiForm component="form" onSubmit={submitConfigurationChange}>
            <EuiFormRow label="GitHub App ID">
              <div>{secret!.app_id}</div>
            </EuiFormRow>
            {secret!.base_url && (
              <EuiFormRow label="Base URL">
                <div>{secret!.base_url}</div>
              </EuiFormRow>
            )}
            <EuiFormRow label="Private key">
              <>
                <div>SHA256:{secret!.fingerprint}</div>
                <EuiSpacer size="s" />
                <EuiFilePicker
                  key={secret!.fingerprint} // clear staged file by rerendering the file picker each time the fingerprint changes
                  onChange={(files) => handlePrivateKeyUpload(files, setStagedPrivateKey)}
                  initialPromptText={i18n.translate(
                    'xpack.enterpriseSearch.workplaceSearch.sources.sourceSettings.pemKeyPrompText',
                    { defaultMessage: 'Upload a new .pem file to rotate the private key' }
                  )}
                  accept=".pem"
                />
              </>
            </EuiFormRow>
            <EuiButton
              type="submit"
              isLoading={isConfigurationUpdateButtonLoading}
              disabled={!stagedPrivateKey}
            >
              {SAVE_BUTTON_LABEL}
            </EuiButton>
          </EuiForm>
        </ContentSection>
      )}
      <ContentSection title={SYNC_DIAGNOSTICS_TITLE} description={SYNC_DIAGNOSTICS_DESCRIPTION}>
        <DownloadDiagnosticsButton label={SYNC_DIAGNOSTICS_BUTTON} />
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
    </SourceLayout>
  );
};
