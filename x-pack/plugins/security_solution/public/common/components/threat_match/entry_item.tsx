/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { FieldComponent } from '@kbn/securitysolution-autocomplete';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { FormattedEntry, Entry } from './types';
import * as i18n from './translations';
import { getEntryOnFieldChange, getEntryOnThreatFieldChange } from './helpers';

interface EntryItemProps {
  entry: FormattedEntry;
  indexPattern: DataViewBase;
  threatIndexPatterns: DataViewBase;
  showLabel: boolean;
  onChange: (arg: Entry, i: number) => void;
}

const FlexItemWithLabel = styled(EuiFlexItem)`
  padding-top: 20px;
  text-align: center;
`;

const FlexItemWithoutLabel = styled(EuiFlexItem)`
  text-align: center;
`;

export const EntryItem: React.FC<EntryItemProps> = ({
  entry,
  indexPattern,
  threatIndexPatterns,
  showLabel,
  onChange,
}): JSX.Element => {
  const handleFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      const { updatedEntry, index } = getEntryOnFieldChange(entry, newField);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const handleThreatFieldChange = useCallback(
    ([newField]: DataViewFieldBase[]): void => {
      const { updatedEntry, index } = getEntryOnThreatFieldChange(entry, newField);
      onChange(updatedEntry, index);
    },
    [onChange, entry]
  );

  const renderFieldInput = useMemo(() => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.FIELD_PLACEHOLDER}
        indexPattern={indexPattern}
        selectedField={entry.field}
        isClearable={false}
        isLoading={false}
        isDisabled={indexPattern == null}
        onChange={handleFieldChange}
        data-test-subj="entryField"
        fieldInputWidth={360}
      />
    );

    if (showLabel) {
      return (
        <EuiFormRow label={i18n.FIELD} data-test-subj="entryItemFieldInputFormRow">
          {comboBox}
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFormRow label={''} data-test-subj="entryItemFieldInputFormRow">
          {comboBox}
        </EuiFormRow>
      );
    }
  }, [handleFieldChange, indexPattern, entry, showLabel]);

  const renderThreatFieldInput = useMemo(() => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.FIELD_PLACEHOLDER}
        indexPattern={threatIndexPatterns}
        selectedField={entry.value}
        isClearable={false}
        isLoading={false}
        isDisabled={threatIndexPatterns == null}
        onChange={handleThreatFieldChange}
        data-test-subj="threatEntryField"
        fieldInputWidth={360}
      />
    );

    if (showLabel) {
      return (
        <EuiFormRow label={i18n.THREAT_FIELD} data-test-subj="threatFieldInputFormRow">
          {comboBox}
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFormRow label={''} data-test-subj="threatFieldInputFormRow">
          {comboBox}
        </EuiFormRow>
      );
    }
  }, [handleThreatFieldChange, threatIndexPatterns, entry, showLabel]);

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceAround"
      data-test-subj="itemEntryContainer"
    >
      <EuiFlexItem grow={false}>{renderFieldInput}</EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup justifyContent="spaceAround" alignItems="center">
          {showLabel ? (
            <FlexItemWithLabel grow={true}>{i18n.MATCHES}</FlexItemWithLabel>
          ) : (
            <FlexItemWithoutLabel grow={true}>{i18n.MATCHES}</FlexItemWithoutLabel>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{renderThreatFieldInput}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

EntryItem.displayName = 'EntryItem';
