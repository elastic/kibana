/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiFormRow, EuiComboBox, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UrlComboBoxLogic } from './url_combo_box_logic';

import './url_combo_box.scss';

const isUrl = (value: string) => {
  let url;

  try {
    url = new URL(value);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
};

interface Props {
  label: string;
  selectedUrls: string[];
  onChange(selectedUrls: string[]): void;
}

export const UrlComboBox: React.FC<Props> = ({ label, selectedUrls, onChange }) => {
  const id = useGeneratedHtmlId();
  const urlComboBoxLogic = UrlComboBoxLogic({ id });
  const { isInvalid } = useValues(urlComboBoxLogic);
  const { setIsInvalid } = useActions(urlComboBoxLogic);

  return (
    <EuiFormRow
      className="urlComboBox"
      fullWidth
      label={label}
      isInvalid={isInvalid}
      error={
        isInvalid
          ? i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.urlComboBox.invalidUrlErrorMessage',
              {
                defaultMessage: 'Please enter a valid URL',
              }
            )
          : undefined
      }
    >
      <EuiComboBox
        fullWidth
        noSuggestions
        selectedOptions={selectedUrls.map((selectedUrl) => ({ label: selectedUrl }))}
        onCreateOption={(newUrl) => {
          if (!isUrl(newUrl)) {
            setIsInvalid(true);
            // Return false to explicitly reject the user's input.
            return false;
          }

          setIsInvalid(false);

          onChange([...selectedUrls, newUrl]);
        }}
        onSearchChange={() => {
          setIsInvalid(false);
        }}
        onChange={(newOptions) => {
          onChange(newOptions.map((newOption) => newOption.label));
        }}
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
};
