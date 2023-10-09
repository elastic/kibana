/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiImage,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { LanguageDefinition, Languages } from '@kbn/search-api-panels';

export interface LanguageGridProps {
  assetBasePath: string;
  languages: LanguageDefinition[];
  selectedLanguage: Languages;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  defaultVisibleCount?: number;
}

export const LanguageGrid: React.FC<LanguageGridProps> = ({
  assetBasePath,
  languages,
  selectedLanguage,
  setSelectedLanguage,
  defaultVisibleCount = 4,
}: LanguageGridProps) => {
  const { euiTheme } = useEuiTheme();
  const [allLanguagesVisible, setAllLanguagesVisible] = useState<boolean>(false);
  const visibleLanguages = allLanguagesVisible
    ? languages
    : languages.slice(0, defaultVisibleCount);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGrid columns={2} gutterSize="s">
          {visibleLanguages.map((language) => (
            <EuiFlexItem>
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
              >
                <EuiFlexGroup justifyContent="flexStart">
                  <EuiFlexItem grow={false}>
                    <EuiImage
                      alt=""
                      src={`${assetBasePath}/${language.iconType}`}
                      height={euiTheme.size.l}
                      width={euiTheme.size.l}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
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
      </EuiFlexItem>
      <EuiFlexItem>
        {allLanguagesVisible ? (
          <EuiButton
            iconSide="right"
            iconType="arrowUp"
            onClick={() => setAllLanguagesVisible(false)}
          >
            {i18n.translate('xpack.serverlessSearch.selectClient.languagesGrid.showLessLabel', {
              defaultMessage: 'See less',
            })}
          </EuiButton>
        ) : (
          <EuiButton
            iconSide="right"
            iconType="arrowDown"
            onClick={() => setAllLanguagesVisible(true)}
          >
            {i18n.translate('xpack.serverlessSearch.selectClient.languagesGrid.showMoreLabel', {
              defaultMessage: 'See {additionalCount} more',
              values: {
                additionalCount: languages.length - defaultVisibleCount,
              },
            })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
