/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../shared/doc_links';
import { Loading } from '../../../shared/loading';
import { SourceIcon } from '../../components/shared/source_icon';

import {
  EXTERNAL_IDENTITIES_LINK,
  DOCUMENT_PERMISSIONS_LINK,
  UNDERSTAND_BUTTON,
} from './constants';
import { SourcesLogic } from './sources_logic';

interface SourcesViewProps {
  children: React.ReactNode;
}

export const SourcesView: React.FC<SourcesViewProps> = ({ children }) => {
  const { resetPermissionsModal } = useActions(SourcesLogic);
  const { dataLoading, permissionsModal } = useValues(SourcesLogic);

  if (dataLoading) return <Loading />;

  const PermissionsModal = ({
    addedSourceName,
    serviceType,
  }: {
    addedSourceName: string;
    serviceType: string;
  }) => (
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
              <SourceIcon serviceType={serviceType} name={addedSourceName} size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('xpack.enterpriseSearch.workplaceSearch.sourcesView.modal.heading', {
                defaultMessage: '{addedSourceName} requires additional configuration',
                values: { addedSourceName },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.sourcesView.modal.success"
              defaultMessage="{addedSourceName} has been successfully connected and initial content synchronization is already underway. Since you have elected to synchronize document-level permission information, you must now provide user and group mappings using the {externalIdentitiesLink}."
              values={{
                addedSourceName,
                externalIdentitiesLink: (
                  <EuiLink target="_blank" href={docLinks.workplaceSearchExternalIdentities}>
                    {EXTERNAL_IDENTITIES_LINK}
                  </EuiLink>
                ),
              }}
            />
          </p>

          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.workplaceSearch.sourcesView.modal.docPermissions.description"
              defaultMessage="Documents will not be searchable from Workplace Search until user and group mappings have been configured. {documentPermissionsLink}."
              values={{
                documentPermissionsLink: (
                  <EuiLink target="_blank" href={docLinks.workplaceSearchDocumentPermissions}>
                    {DOCUMENT_PERMISSIONS_LINK}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={resetPermissionsModal} fill>
          {UNDERSTAND_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );

  return (
    <>
      {permissionsModal?.additionalConfiguration && (
        <PermissionsModal
          addedSourceName={permissionsModal.addedSourceName}
          serviceType={permissionsModal.serviceType}
        />
      )}
      {children}
    </>
  );
};
