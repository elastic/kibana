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
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import type { FormattedEntry, Entry } from './types';
import * as i18n from './translations';
import { getEntryOnFieldChange, getEntryOnThreatFieldChange } from './helpers';
import { useKibana } from '../../lib/kibana';

interface EntryItemProps {
  entry: FormattedEntry;
  indexPattern: DataViewSpec | undefined;
  threatIndexPatterns: DataViewSpec | undefined;
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
  const { fieldFormats } = useKibana().services;

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

  const dataViewInstance = useMemo(() => {
    if (indexPattern != null) {
      const dv = new DataView({ spec: indexPattern, fieldFormats });
      return { ...dv, fields: Object.values(indexPattern.fields ?? {}) } as DataView;
    }
    return [];
  }, [indexPattern, fieldFormats]);

  const threatDataViewInstance = useMemo(() => {
    if (threatIndexPatterns != null) {
      const dv = new DataView({ spec: threatIndexPatterns, fieldFormats });
      return { ...dv, fields: Object.values(threatIndexPatterns.fields ?? {}) } as DataView;
    }
    return [];
  }, [threatIndexPatterns, fieldFormats]);

  const renderFieldInput = useMemo(() => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.FIELD_PLACEHOLDER}
        indexPattern={dataViewInstance as DataViewBase}
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
  }, [dataViewInstance, entry.field, indexPattern, handleFieldChange, showLabel]);

  const renderThreatFieldInput = useMemo(() => {
    const comboBox = (
      <FieldComponent
        placeholder={i18n.FIELD_PLACEHOLDER}
        indexPattern={threatDataViewInstance as DataViewBase}
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
  }, [
    threatDataViewInstance,
    entry.value,
    threatIndexPatterns,
    handleThreatFieldChange,
    showLabel,
  ]);

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
