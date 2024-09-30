/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon, EuiSuperSelect, EuiText, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { AvailableLanguages } from '../../code_examples';
import { CodeLanguage } from '../../types';

export interface LanguageSelectorProps {
  selectedLanguage: AvailableLanguages;
  options: CodeLanguage[];
  onSelectLanguage: (value: AvailableLanguages) => void;
}

export const LanguageSelector = ({
  selectedLanguage,
  options,
  onSelectLanguage,
}: LanguageSelectorProps) => {
  const assetBasePath = useAssetBasePath();
  const languageOptions = useMemo(
    () =>
      options.map((lang) => ({
        value: lang.id as AvailableLanguages,
        'aria-label': i18n.translate('xpack.searchIndices.codeLanguage.selectChangeAriaLabel', {
          defaultMessage:
            'Change language of code examples to {language} for every instance on this page',
          values: {
            language: lang.title,
          },
        }),
        'data-test-subj': `lang-option-${lang.id}`,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiIcon type={`${assetBasePath}/${lang.icon}`} />
            <EuiText>{lang.title}</EuiText>
          </EuiFlexGroup>
        ),
      })),
    [assetBasePath, options]
  );
  return (
    <EuiSuperSelect<AvailableLanguages>
      options={languageOptions}
      valueOfSelected={selectedLanguage}
      onChange={(value) => onSelectLanguage(value)}
    />
  );
};
