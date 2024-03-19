/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type DataView } from '@kbn/data-views-plugin/common';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED } from '../../../common/constants';
import { FieldsSelectorTable } from './fields_selector_table';
import {
  CSP_FIELDS_SELECTOR_CLOSE_BUTTON,
  CSP_FIELDS_SELECTOR_MODAL,
  CSP_FIELDS_SELECTOR_RESET_BUTTON,
} from '../../test_subjects';

interface FieldsSelectorModalProps {
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  closeModal: () => void;
  onResetColumns: () => void;
}

const title = i18n.translate('xpack.csp.dataTable.fieldsModalTitle', {
  defaultMessage: 'Fields',
});

export const FieldsSelectorModal = ({
  closeModal,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
  onResetColumns,
}: FieldsSelectorModalProps) => {
  const [isFilterSelectedEnabled, setIsFilterSelectedEnabled] = useSessionStorage(
    SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED,
    false
  );

  const onFilterSelectedChange = useCallback(
    (enabled: boolean) => {
      setIsFilterSelectedEnabled(enabled);
    },
    [setIsFilterSelectedEnabled]
  );

  return (
    <EuiModal onClose={closeModal} data-test-subj={CSP_FIELDS_SELECTOR_MODAL}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FieldsSelectorTable
          title={title}
          dataView={dataView}
          columns={columns}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          isFilterSelectedEnabled={isFilterSelectedEnabled}
          onFilterSelectedChange={onFilterSelectedChange}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onResetColumns} data-test-subj={CSP_FIELDS_SELECTOR_RESET_BUTTON}>
          <FormattedMessage
            id="xpack.csp.dataTable.fieldsModalReset"
            defaultMessage="Reset Fields"
          />
        </EuiButtonEmpty>
        <EuiButton onClick={closeModal} fill data-test-subj={CSP_FIELDS_SELECTOR_CLOSE_BUTTON}>
          <FormattedMessage id="xpack.csp.dataTable.fieldsModalClose" defaultMessage="Close" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
