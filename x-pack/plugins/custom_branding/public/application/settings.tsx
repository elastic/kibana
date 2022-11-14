/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiTitle,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFilePicker,
} from '@elastic/eui';
import { SettingsItem, settingsItems } from './settings_items';

export const Settings = ({}) => {
  const [selectedValues, setSelectedValues] = useState<Record<any, any>>({});

  const onFileSelection = (files: FileList | null, id: string) => {
    if (files && files.length > 0) {
      const selectedValuesCpy = { ...selectedValues };
      selectedValuesCpy[id] = Array.from(files);
      setSelectedValues(selectedValuesCpy);
    }
  };

  const renderItemTitle = (title: string) => {
    return (
      <h3>
        <span className="mgtAdvancedSettings__fieldTitle">{title}</span>
      </h3>
    );
  };

  const renderField = (settingItem: SettingsItem) => {
    const { label, title, helpText, type, description, value } = settingItem;

    if (type === 'file') {
      return <EuiFilePicker id={title} onChange={(files) => onFileSelection(files, title)} />;
    }

    return (
      <EuiFieldText
        value={value}
        onChange={() => {}}
        isLoading={false}
        disabled={false}
        fullWidth
        data-test-subj={`advancedSetting-editField-${name}`}
      />
    );
  };

  const renderItem = (settingItem: SettingsItem) => {
    const { label, title, helpText, description, value } = settingItem;

    return (
      <EuiDescribedFormGroup
        id={title}
        title={renderItemTitle(title)}
        description={<div>{description}</div>}
        fullWidth
      >
        <EuiFormRow
          label={settingItem.label}
          helpText={<span>{helpText ? helpText : null}</span>}
          className="fieldRow"
          hasChildLabel={true}
          fullWidth
        >
          {renderField(settingItem)}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  return (
    <Fragment key="settings">
      <EuiSplitPanel.Outer hasBorder>
        <EuiSplitPanel.Inner color="subdued">
          <EuiFlexGroup alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>General</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner>{settingsItems.map((item) => renderItem(item))}</EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiSpacer size="l" />
    </Fragment>
  );
};
