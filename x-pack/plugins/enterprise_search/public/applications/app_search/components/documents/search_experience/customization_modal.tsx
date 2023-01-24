/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL, CANCEL_BUTTON_LABEL } from '../../../../shared/constants';

import { EngineLogic } from '../../engine';

interface Props {
  filterFields: string[];
  sortFields: string[];
  onClose(): void;
  onSave({ sortFields, filterFields }: { sortFields: string[]; filterFields: string[] }): void;
}

const fieldNameToComboBoxOption = (fieldName: string) => ({ label: fieldName });
const comboBoxOptionToFieldName = ({ label }: { label: string }) => label;

export const CustomizationModal: React.FC<Props> = ({
  filterFields,
  onClose,
  onSave,
  sortFields,
}) => {
  const { engine } = useValues(EngineLogic);

  const [selectedFilterFields, setSelectedFilterFields] = useState(
    filterFields.map(fieldNameToComboBoxOption)
  );
  const [selectedSortFields, setSelectedSortFields] = useState(
    sortFields.map(fieldNameToComboBoxOption)
  );

  const schema = engine.advancedSchema || {};
  const selectableFilterFields = useMemo(
    () =>
      Object.keys(schema)
        .filter((fieldName) => schema[fieldName].capabilities.filter)
        .map(fieldNameToComboBoxOption),
    [schema]
  );
  const selectableSortFields = useMemo(
    () =>
      Object.keys(schema)
        .filter((fieldName) => schema[fieldName].capabilities.sort)
        .map(fieldNameToComboBoxOption),
    [schema]
  );

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.title',
            {
              defaultMessage: 'Customize document search',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.filterFieldsLabel',
              {
                defaultMessage: 'Filter fields',
              }
            )}
            fullWidth
            helpText={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.filterFields',
              {
                defaultMessage:
                  'Faceted values rendered as filters and available as query refinement',
              }
            )}
          >
            <EuiComboBox
              data-test-subj="filterFieldsDropdown"
              fullWidth
              options={selectableFilterFields}
              selectedOptions={selectedFilterFields}
              onChange={setSelectedFilterFields}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.sortFieldsLabel',
              {
                defaultMessage: 'Sort fields',
              }
            )}
            fullWidth
            helpText={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.sortFields',
              {
                defaultMessage: 'Used to display result sorting options, ascending and descending',
              }
            )}
          >
            <EuiComboBox
              data-test-subj="sortFieldsDropdown"
              fullWidth
              options={selectableSortFields}
              selectedOptions={selectedSortFields}
              onChange={setSelectedSortFields}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        <EuiButton
          fill
          onClick={() => {
            onSave({
              filterFields: selectedFilterFields.map(comboBoxOptionToFieldName),
              sortFields: selectedSortFields.map(comboBoxOptionToFieldName),
            });
          }}
        >
          {SAVE_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
