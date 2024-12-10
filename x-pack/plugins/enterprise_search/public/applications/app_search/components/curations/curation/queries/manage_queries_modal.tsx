/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiSpacer,
  EuiButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL } from '../../../../../shared/constants';
import { MultiInputRows } from '../../../multi_input_rows';

import { QUERY_INPUTS_BUTTON, QUERY_INPUTS_PLACEHOLDER } from '../../constants';
import { CurationLogic } from '../curation_logic';

export const ManageQueriesModal: React.FC = () => {
  const { queries, queriesLoading } = useValues(CurationLogic);
  const { updateQueries } = useActions(CurationLogic);

  const [isModalVisible, setModalVisibility] = useState(false);
  const showModal = () => setModalVisibility(true);
  const hideModal = () => setModalVisibility(false);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <>
      <EuiButton
        data-test-subj="enterpriseSearchManageQueriesModalManageQueriesButton"
        fill
        onClick={showModal}
        isLoading={queriesLoading}
      >
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.curations.manageQueryButtonLabel',
          { defaultMessage: 'Manage queries' }
        )}
      </EuiButton>
      {isModalVisible && (
        <EuiModal onClose={hideModal} aria-labelledby={modalTitleId}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.manageQueryTitle',
                { defaultMessage: 'Manage queries' }
              )}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText color="subdued">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.curations.manageQueryDescription',
                  { defaultMessage: 'Edit, add, or remove queries for this curation.' }
                )}
              </p>
            </EuiText>
            <EuiSpacer />
            <MultiInputRows
              id="manageCurationQueries"
              initialValues={queries}
              addRowText={QUERY_INPUTS_BUTTON}
              inputPlaceholder={QUERY_INPUTS_PLACEHOLDER}
              submitButtonText={SAVE_BUTTON_LABEL}
              onSubmit={(newQueries) => {
                updateQueries(newQueries);
                hideModal();
              }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
