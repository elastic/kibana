/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SynonymsLogic } from '..';
import {
  CANCEL_BUTTON_LABEL,
  DELETE_BUTTON_LABEL,
  SAVE_BUTTON_LABEL,
} from '../../../../shared/constants';
import { FlashMessages } from '../../../../shared/flash_messages';
import { MultiInputRows } from '../../multi_input_rows';

import { SYNONYM_CREATE_TITLE, SYNONYM_UPDATE_TITLE, DELETE_CONFIRMATION } from '../constants';

export const SynonymModal: React.FC = () => {
  const { isModalOpen, modalLoading, activeSynonymSet } = useValues(SynonymsLogic);
  const { closeModal, createSynonymSet, updateSynonymSet, deleteSynonymSet } =
    useActions(SynonymsLogic);

  const modalTitle = activeSynonymSet ? SYNONYM_UPDATE_TITLE : SYNONYM_CREATE_TITLE;
  const id = activeSynonymSet?.id || 'createNewSynonymSet';
  const synonyms = activeSynonymSet?.synonyms || ['', ''];
  const onSubmit = activeSynonymSet
    ? (updatedSynonyms: string[]) => updateSynonymSet({ id, synonyms: updatedSynonyms })
    : (newSynonyms: string[]) => createSynonymSet(newSynonyms);

  return isModalOpen ? (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{modalTitle}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <FlashMessages />
      <EuiModalBody>
        <MultiInputRows
          id={id}
          initialValues={synonyms}
          inputPlaceholder={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.synonyms.synonymInputPlaceholder',
            { defaultMessage: 'Enter a synonym' }
          )}
          onSubmit={onSubmit}
          showSubmitButton={false}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem>
            {activeSynonymSet && (
              <span>
                <EuiButtonEmpty
                  color="danger"
                  iconType="trash"
                  onClick={() => {
                    if (window.confirm(DELETE_CONFIRMATION)) deleteSynonymSet(id);
                  }}
                  data-test-subj="deleteSynonymSetButton"
                >
                  {DELETE_BUTTON_LABEL}
                </EuiButtonEmpty>
              </span>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeModal}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              form={id}
              fill
              isLoading={modalLoading}
              data-test-subj="submitSynonymSetButton"
            >
              {SAVE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  ) : null;
};
