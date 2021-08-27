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
  EuiComboBox,
  EuiModalFooter,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { CANCEL_BUTTON_LABEL, SAVE_BUTTON_LABEL } from '../../../../shared/constants';

import {
  ADD_SOURCE_ENGINES_MODAL_TITLE,
  ADD_SOURCE_ENGINES_MODAL_DESCRIPTION,
  ADD_SOURCE_ENGINES_PLACEHOLDER,
} from '../i18n';
import { SourceEnginesLogic } from '../source_engines_logic';

export const AddSourceEnginesModal: React.FC = () => {
  const { addSourceEngines, closeModal, onAddEnginesSelection } = useActions(SourceEnginesLogic);
  const { selectableEngineNames, selectedEngineNamesToAdd, modalLoading } = useValues(
    SourceEnginesLogic
  );

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{ADD_SOURCE_ENGINES_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText color="subdued">{ADD_SOURCE_ENGINES_MODAL_DESCRIPTION}</EuiText>
        <EuiSpacer />
        <EuiComboBox
          options={selectableEngineNames.map((engineName) => ({ label: engineName }))}
          selectedOptions={selectedEngineNamesToAdd.map((engineName) => ({ label: engineName }))}
          onChange={(options) => onAddEnginesSelection(options.map((option) => option.label))}
          placeholder={ADD_SOURCE_ENGINES_PLACEHOLDER}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        <EuiButton
          disabled={selectedEngineNamesToAdd.length === 0}
          isLoading={modalLoading}
          onClick={() => addSourceEngines(selectedEngineNamesToAdd)}
          fill
        >
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
