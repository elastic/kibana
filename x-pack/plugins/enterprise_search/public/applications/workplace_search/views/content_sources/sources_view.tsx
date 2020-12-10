/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';

import { FlashMessagesLogic } from '../../../shared/flash_messages';

import { Loading } from '../../../shared/loading';
import { SourceIcon } from '../../components/shared/source_icon';

import { EXTERNAL_IDENTITIES_DOCS_URL, DOCUMENT_PERMISSIONS_DOCS_URL } from '../../routes';

import { SourcesLogic } from './sources_logic';

const POLLING_INTERVAL = 10000;

interface SourcesViewProps {
  children: React.ReactNode;
}

export const SourcesView: React.FC<SourcesViewProps> = ({ children }) => {
  const { initializeSources, pollForSourceStatusChanges, resetPermissionsModal } = useActions(
    SourcesLogic
  );

  const { dataLoading, permissionsModal } = useValues(SourcesLogic);

  useEffect(() => {
    initializeSources();
    const pollingInterval = window.setInterval(pollForSourceStatusChanges, POLLING_INTERVAL);

    return () => {
      FlashMessagesLogic.actions.clearFlashMessages();
      clearInterval(pollingInterval);
    };
  }, []);

  if (dataLoading) return <Loading />;

  const PermissionsModal = ({
    addedSourceName,
    serviceType,
  }: {
    addedSourceName: string;
    serviceType: string;
  }) => (
    <EuiOverlayMask>
      <EuiModal onClose={resetPermissionsModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiFlexGroup
              justifyContent="flexStart"
              alignItems="center"
              responsive={false}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <SourceIcon serviceType={serviceType} name={addedSourceName} />
              </EuiFlexItem>
              <EuiFlexItem>{addedSourceName} requires additional configuration</EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText grow={false}>
            <p>
              {addedSourceName} has been successfully connected and initial content synchronization
              is already underway. Since you have elected to synchronize document-level permission
              information, you must now provide user and group mappings using the&nbsp;
              <EuiLink target="_blank" href={EXTERNAL_IDENTITIES_DOCS_URL}>
                External Identities API
              </EuiLink>
              .
            </p>

            <p>
              Documents will not be searchable from Workplace Search until user and group mappings
              have been configured.&nbsp;
              <EuiLink target="_blank" href={DOCUMENT_PERMISSIONS_DOCS_URL}>
                Learn more about document-level permission configuration
              </EuiLink>
              .
            </p>
          </EuiText>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={resetPermissionsModal} fill>
            I understand
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );

  return (
    <>
      {!!permissionsModal && permissionsModal.additionalConfiguration && (
        <PermissionsModal
          addedSourceName={permissionsModal.addedSourceName}
          serviceType={permissionsModal.serviceType}
        />
      )}
      {children}
    </>
  );
};
