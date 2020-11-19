/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { History } from 'history';
import { useActions, useValues } from 'kea';
import { isEmpty } from 'lodash';
import { Link, useHistory } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import FlashMessages from 'shared/components/FlashMessages';
import { SOURCES_PATH, getSourcesPath } from '../../../routes';

import { ContentSection } from '../../../components/shared/content_section';
import { SourceConfigFields } from '../../../components/shared/source_config_fields';
import { ViewContentHeader } from '../../../components/shared/view_content_header';

import { SourceDataItem } from '../../../types';
import { AppLogic } from '../../../app_logic';
import { staticSourceData } from '../source_data';

import { SourceLogic } from '../source_logic';

export const SourceSettings: React.FC = () => {
  const history = useHistory() as History;
  const {
    updateContentSource,
    removeContentSource,
    resetSourceState,
    getSourceConfigData,
  } = useActions(SourceLogic);

  const {
    contentSource: { name, id, serviceType },
    flashMessages,
    buttonLoading,
    sourceConfigData: { configuredFields },
  } = useValues(SourceLogic);

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    getSourceConfigData(serviceType);
    return resetSourceState;
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

  const handleNameChange = (e) => setValue(e.target.value);

  const submitNameChange = (e) => {
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
    const onSourceRemoved = () => history.push(getSourcesPath(SOURCES_PATH, isOrganization));
    removeContentSource(id, onSourceRemoved);
  };

  const confirmModal = (
    <EuiOverlayMask>
      <EuiConfirmModal
        title="Please confirm"
        onConfirm={handleSourceRemoval}
        onCancel={hideConfirm}
        buttonColor="danger"
        cancelButtonText="Cancel"
        confirmButtonText="Ok"
        defaultFocusedButton="confirm"
      >
        Your source documents will be deleted from Workplace Search. <br />
        Are you sure you want to remove {name}?
      </EuiConfirmModal>
    </EuiOverlayMask>
  );

  return (
    <>
      <ViewContentHeader title="Source settings" />
      <EuiSpacer />
      {!!flashMessages && <FlashMessages {...flashMessages} />}
      <ContentSection
        title="Content source name"
        description="Customize the name of this content source."
      >
        <form onSubmit={submitNameChange}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFormRow>
                <EuiFieldText
                  value={inputValue}
                  size={64}
                  onChange={handleNameChange}
                  aria-label="Source Name"
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
                Save changes
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </form>
      </ContentSection>
      {showConfig && (
        <ContentSection
          title="Content source configuration"
          description="Edit content source connector settings to change."
        >
          <SourceConfigFields
            clientId={clientId}
            clientSecret={clientSecret}
            publicKey={isPublicKey ? publicKey : undefined}
            consumerKey={consumerKey || undefined}
            baseUrl={baseUrl}
          />
          <EuiFormRow>
            <Link to={editPath}>
              <EuiButtonEmpty flush="left">Edit content source connector settings</EuiButtonEmpty>
            </Link>
          </EuiFormRow>
        </ContentSection>
      )}
      <ContentSection title="Remove this source" description="This action cannot be undone.">
        <EuiButton
          isLoading={buttonLoading}
          data-test-subj="DeleteSourceButton"
          fill
          color="danger"
          onClick={showConfirm}
        >
          Remove
        </EuiButton>
        {confirmModalVisible && confirmModal}
      </ContentSection>
    </>
  );
};
