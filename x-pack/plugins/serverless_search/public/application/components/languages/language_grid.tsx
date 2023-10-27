/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiImage,
  EuiText,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';

import { LanguageDefinition, Languages } from '@kbn/search-api-panels';

export interface LanguageGridProps {
  assetBasePath: string;
  languages: LanguageDefinition[];
  selectedLanguage: Languages;
  setSelectedLanguage: (language: LanguageDefinition) => void;
}

export const LanguageGrid: React.FC<LanguageGridProps> = ({
  assetBasePath,
  languages,
  selectedLanguage,
  setSelectedLanguage,
}: LanguageGridProps) => {
  const { euiTheme } = useEuiTheme();
  const isLarge = useIsWithinBreakpoints(['l']);
  const isXLarge = useIsWithinBreakpoints(['xl']);
  const columns = isXLarge ? 3 : isLarge ? 2 : 1;

  return (
    <EuiFlexGrid columns={columns} gutterSize="s" data-test-subj="client-select-container">
      {languages.map((language) => (
        <EuiFlexItem key={language.id}>
          <EuiPanel
            hasBorder
            borderRadius="m"
            className={
              language.id === selectedLanguage
                ? 'serverlessSearchSelectClientPanelSelectedBorder'
                : 'serverlessSearchSelectClientPanelBorder'
            }
            onClick={() => setSelectedLanguage(language)}
            color={language.id === selectedLanguage ? 'primary' : 'plain'}
            data-test-subj={`${language.id}-client-panel`}
          >
            <EuiFlexGroup justifyContent="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiImage
                  alt=""
                  src={`${assetBasePath}/${language.iconType}`}
                  height={euiTheme.size.l}
                  width={euiTheme.size.l}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  textAlign="left"
                  color={language.id === selectedLanguage ? 'default' : 'subdued'}
                >
                  <h5>{language.name}</h5>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
