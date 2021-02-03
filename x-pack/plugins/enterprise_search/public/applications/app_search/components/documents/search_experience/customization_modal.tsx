/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';

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
  EuiOverlayMask,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useValues } from 'kea';

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

  const engineSchema = engine.schema || {};
  const selectableFilterFields = useMemo(
    () => Object.keys(engineSchema).map(fieldNameToComboBoxOption),
    [engineSchema]
  );
  const selectableSortFields = useMemo(
    () => Object.keys(engineSchema).map(fieldNameToComboBoxOption),
    [engineSchema]
  );

  return (
    <EuiOverlayMask>
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
              fullWidth={true}
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
                fullWidth={true}
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
              fullWidth={true}
              helpText={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.sortFields',
                {
                  defaultMessage:
                    'Used to display result sorting options, ascending and descending',
                }
              )}
            >
              <EuiComboBox
                data-test-subj="sortFieldsDropdown"
                fullWidth={true}
                options={selectableSortFields}
                selectedOptions={selectedSortFields}
                onChange={setSelectedSortFields}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.cancel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={() => {
              onSave({
                filterFields: selectedFilterFields.map(comboBoxOptionToFieldName),
                sortFields: selectedSortFields.map(comboBoxOptionToFieldName),
              });
            }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documents.search.customizationModal.save',
              {
                defaultMessage: 'Save',
              }
            )}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
