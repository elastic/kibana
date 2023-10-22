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
import numeral from '@elastic/numeral';
import { FieldsSelectorModal } from './fields_selector';
import { FindingsGroupBySelector } from '../../pages/configurations/layout/findings_group_by_selector';
import { useStyles } from './use_styles';

const formatNumber = (value: number) => {
  return value < 1000 ? value : numeral(value).format('0.0a');
};

export const AdditionalControls = ({
  total,
  title,
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
}: {
  total: number;
  title: string;
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
}) => {
  const styles = useStyles();

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
        <span className="cspDataTableTotal">{`${formatNumber(total)} ${title}`}</span>
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
      <EuiFlexItem grow={false} className={styles.groupBySelector}>
        <FindingsGroupBySelector type="default" />
      </EuiFlexItem>
    </>
  );
};
