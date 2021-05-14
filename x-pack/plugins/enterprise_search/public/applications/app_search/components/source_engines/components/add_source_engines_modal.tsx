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
import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL, SAVE_BUTTON_LABEL } from '../../../../shared/constants';

import { SourceEnginesLogic } from '../source_engines_logic';

export const AddSourceEnginesModal: React.FC = () => {
  const { addSourceEngines, closeAddSourceEnginesModal, setSelectedEngineNamesToAdd } = useActions(
    SourceEnginesLogic
  );
  const { indexedEngines, selectedEngineNamesToAdd, sourceEngines } = useValues(SourceEnginesLogic);

  const sourceEngineNames = sourceEngines.map((sourceEngine) => sourceEngine.name);
  const selectableEngineNames = indexedEngines
    .map((engine) => engine.name)
    .filter((engineName) => !sourceEngineNames.includes(engineName));

  return (
    <EuiModal onClose={closeAddSourceEnginesModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesModal.title',
            { defaultMessage: 'Add engines' }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText color="subdued">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesModal.description',
            { defaultMessage: 'Add additional engines to this meta engine.' }
          )}
        </EuiText>
        <EuiSpacer />
        <EuiComboBox
          options={selectableEngineNames.map((engineName) => ({ label: engineName }))}
          selectedOptions={selectedEngineNamesToAdd.map((engineName) => ({ label: engineName }))}
          onChange={(options) => setSelectedEngineNamesToAdd(options.map((option) => option.label))}
          placeholder={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.souceEngines.addSourceEnginesModal.placeholder',
            { defaultMessage: 'Select engine(s)' }
          )}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeAddSourceEnginesModal}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        <EuiButton
          disabled={selectedEngineNamesToAdd.length === 0}
          onClick={() => addSourceEngines(selectedEngineNamesToAdd)}
          fill
        >
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
