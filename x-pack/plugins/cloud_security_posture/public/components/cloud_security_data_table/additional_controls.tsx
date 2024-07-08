/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, PropsWithChildren } from 'react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { type DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldsSelectorModal, useFieldsModal } from './fields_selector';
import { useStyles } from './use_styles';
import { getAbbreviatedNumber } from '../../common/utils/get_abbreviated_number';
import { CSP_FIELDS_SELECTOR_OPEN_BUTTON } from '../test_subjects';

const GroupSelectorWrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const styles = useStyles();

  return (
    <EuiFlexItem grow={false} className={styles.groupBySelector}>
      {children}
    </EuiFlexItem>
  );
};

export const AdditionalControls = ({
  total,
  title,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
  groupSelectorComponent,
  onResetColumns,
}: {
  total: number;
  title: string;
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  groupSelectorComponent?: JSX.Element;
  onResetColumns: () => void;
}) => {
  const { isFieldSelectorModalVisible, closeFieldsSelectorModal, openFieldsSelectorModal } =
    useFieldsModal();

  return (
    <>
      {isFieldSelectorModalVisible && (
        <FieldsSelectorModal
          columns={columns}
          dataView={dataView}
          closeModal={closeFieldsSelectorModal}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          onResetColumns={onResetColumns}
        />
      )}
      <EuiFlexItem grow={0}>
        <span className="cspDataTableTotal">{`${getAbbreviatedNumber(total)} ${title}`}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiButtonEmpty
          className="cspDataTableFields"
          iconType="tableOfContents"
          onClick={openFieldsSelectorModal}
          size="xs"
          color="text"
          data-test-subj={CSP_FIELDS_SELECTOR_OPEN_BUTTON}
        >
          <FormattedMessage id="xpack.csp.dataTable.fieldsButton" defaultMessage="Fields" />
        </EuiButtonEmpty>
      </EuiFlexItem>
      {groupSelectorComponent && (
        <GroupSelectorWrapper>{groupSelectorComponent}</GroupSelectorWrapper>
      )}
    </>
  );
};
