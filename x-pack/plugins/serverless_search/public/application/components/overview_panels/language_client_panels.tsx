/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import React from 'react';
import { PLUGIN_ID } from '../../../../common';
import { useKibanaServices } from '../../hooks/use_kibana';
import { LanguageDefinition } from '../languages/types';
import './select_client.scss';
interface SelectClientProps {
  setSelectedLanguage: (language: LanguageDefinition) => void;
  languages: LanguageDefinition[];
  selectedLanguage: LanguageDefinition;
}

export const LanguageClientPanels: React.FC<SelectClientProps> = ({
  setSelectedLanguage,
  languages,
  selectedLanguage,
}) => {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibanaServices();
  const panelItems = languages.map((language, index) => (
    <EuiPanel
      key={`panel.${index}`}
      hasBorder
      borderRadius="m"
      className={
        selectedLanguage === language
          ? 'serverlessSearchSelectClientPanelSelectedBorder'
          : 'serverlessSearchSelectClientPanelBorder'
      }
      onClick={() => setSelectedLanguage(language)}
      color={selectedLanguage === language ? 'primary' : 'plain'}
    >
      <EuiFlexGroup direction="column" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiImage
            alt=""
            src={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/${language.iconType}`)}
            height={euiTheme.size.xl}
            width={euiTheme.size.xl}
          />
          <EuiSpacer size="s" />
          <EuiText textAlign="center" color={selectedLanguage === language ? 'default' : 'subdued'}>
            <h5>{language.name}</h5>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  ));
  return (
    <EuiFlexGroup gutterSize="xs" direction="row">
      {panelItems.map((panelItem, index) => (
        <EuiFlexItem key={`panelItem.${index}`}>{panelItem}</EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
