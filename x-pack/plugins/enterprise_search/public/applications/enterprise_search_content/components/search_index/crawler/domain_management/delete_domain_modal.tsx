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
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { DeleteCrawlerDomainApiLogic } from '../../../../api/crawler/delete_crawler_domain_api_logic';

import { DeleteDomainModalLogic } from './delete_domain_modal_logic';

export const DeleteDomainModal: React.FC = () => {
  DeleteCrawlerDomainApiLogic.mount();
  const { deleteDomain, hideModal } = useActions(DeleteDomainModalLogic);
  const { domain, isLoading, isHidden } = useValues(DeleteDomainModalLogic);

  if (isHidden) {
    return null;
  }

  return (
    <EuiModal onClose={hideModal} aria-label={'Delete domain'}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Delete domain'}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          Remove the domain <strong>{domain?.url}</strong> from your crawler. This will also delete
          all entry points and crawl rules you have set up. Any documents related to this domain
          will be removed on the next crawl. <strong>This cannot be undone.</strong>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="GenericConfirmationModalCancel" onClick={hideModal}>
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButton
          data-test-subj="GenericConfirmationModalSave"
          onClick={deleteDomain}
          isLoading={isLoading}
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.modal.save', {
            defaultMessage: 'Delete domain',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
