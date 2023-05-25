/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiThemeProvider,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { PLUGIN_ID } from '../../../common';
import { useKibanaServices } from '../hooks/use_kibana';
import { LanguageDefinition } from './languages/types';
import './code_box.scss';

interface CodeBoxProps {
  languages: LanguageDefinition[];
  code: keyof LanguageDefinition;
  // overrides the language type for syntax highlighting
  languageType?: string;
  selectedLanguage: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
}

export const CodeBox: React.FC<CodeBoxProps> = ({
  code,
  languages,
  languageType,
  selectedLanguage,
  setSelectedLanguage,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const { http } = useKibanaServices();
  const items = languages.map((language) => (
    <EuiContextMenuItem
      key={language.id}
      icon={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${language.iconType}`)}
      onClick={() => {
        setSelectedLanguage(language);
        setIsPopoverOpen(false);
      }}
    >
      {language.name}
    </EuiContextMenuItem>
  ));

  const button = (
    <EuiThemeProvider colorMode="dark">
      <EuiButtonEmpty
        aria-label={i18n.translate('xpack.serverlessSearch.codeBox.selectAriaLabel', {
          defaultMessage: 'Select a programming language',
        })}
        color="text"
        iconType="arrowDown"
        iconSide="left"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        {selectedLanguage.name}
      </EuiButtonEmpty>
    </EuiThemeProvider>
  );

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel paddingSize="xs" className="serverlessSearchCodeBlockControlsPanel">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiThemeProvider colorMode="light">
              <EuiPopover
                button={button}
                isOpen={isPopoverOpen}
                closePopover={() => setIsPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={items} size="s" />
              </EuiPopover>
            </EuiThemeProvider>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={selectedLanguage[code] ?? ''}>
              {(copy) => (
                <EuiButtonEmpty color="text" iconType="copy" size="s" onClick={copy}>
                  {i18n.translate('xpack.serverlessSearch.codeBox.copyButtonLabel', {
                    defaultMessage: 'Copy',
                  })}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        <EuiCodeBlock
          transparentBackground
          fontSize="m"
          language={languageType || selectedLanguage.languageStyling || selectedLanguage.id}
        >
          {selectedLanguage[code]}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
