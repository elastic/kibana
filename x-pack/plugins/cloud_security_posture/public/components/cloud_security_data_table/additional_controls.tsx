/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { type DataView } from '@kbn/data-views-plugin/common';
import { FieldsSelectorModal } from './fields_selector';
import { useStyles } from './use_styles';
import { getAbbreviatedNumber } from '../../common/utils/get_abbreviated_number';

const GroupSelectorWrapper: React.FC = ({ children }) => {
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
}: {
  total: number;
  title: string;
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  groupSelectorComponent?: JSX.Element;
}) => {
  const [isFieldSelectorModalVisible, setIsFieldSelectorModalVisible] = useState(false);

  const closeModal = () => setIsFieldSelectorModalVisible(false);
  const showModal = () => setIsFieldSelectorModalVisible(true);

  return (
    <>
      {isFieldSelectorModalVisible && (
        <FieldsSelectorModal
          columns={columns}
          dataView={dataView}
          closeModal={closeModal}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        />
      )}
      <EuiFlexItem grow={0}>
        <span className="cspDataTableTotal">{`${getAbbreviatedNumber(total)} ${title}`}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiButtonEmpty
          className="cspDataTableFields"
          iconType="tableOfContents"
          onClick={showModal}
          size="xs"
          color="text"
        >
          {i18n.translate('xpack.csp.dataTable.fields', {
            defaultMessage: 'Fields',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      {groupSelectorComponent && (
        <GroupSelectorWrapper>{groupSelectorComponent}</GroupSelectorWrapper>
      )}
    </>
  );
};
