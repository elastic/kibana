/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

import { AddAnalyticsCollectionLogic } from './add_analytics_collection_logic';

const collectionNameField = 'collection-name';
const minModalWidth = 400;

interface AddAnalyticsCollectionModalProps {
  onClose: () => void;
}

export const AddAnalyticsCollectionModal: React.FC<AddAnalyticsCollectionModalProps> = ({
  onClose,
}) => {
  const { isLoading, isSuccess, isSystemError, canSubmit } = useValues(AddAnalyticsCollectionLogic);
  const modalFormId = useGeneratedHtmlId({ prefix: 'createAnalyticsCollection' });

  useEffect(() => {
    if (isSuccess || isSystemError) {
      onClose();
    }
  }, [isSuccess, isSystemError]);

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={minModalWidth}
      initialFocus={`[name=${collectionNameField}]`}
    >
      <EuiModalHeader>
        <EuiFlexItem>
          <EuiModalHeaderTitle>
            {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.title', {
              defaultMessage: 'Name your Collection',
            })}
          </EuiModalHeaderTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.subtitle', {
                defaultMessage:
                  "Consider carefully what you want to name your Collection. You can't rename it later.",
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiModalHeader>

      <EuiModalBody>
        <AddAnalyticsCollectionForm
          formId={modalFormId}
          collectionNameField={collectionNameField}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="enterpriseSearchAddAnalyticsCollectionModalCancelButton"
          onClick={onClose}
        >
          {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="enterpriseSearchAddAnalyticsCollectionModalCreateButton"
          fill
          type="submit"
          form={modalFormId}
          iconType="plusInCircle"
          isLoading={isLoading}
          isDisabled={!canSubmit}
        >
          {i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.form.createButton', {
            defaultMessage: 'Create',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
