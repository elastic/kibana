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
  language: LanguageDefinition;
  setSelectedLanguage: (language: LanguageDefinition) => void;
  isSelectedLanguage: boolean;
}

export const LanguageClientPanel: React.FC<SelectClientProps> = ({
  language,
  setSelectedLanguage,
  isSelectedLanguage,
}) => {
  const { euiTheme } = useEuiTheme();
  const { http } = useKibanaServices();

  return (
    <EuiFlexGroup gutterSize="xs" direction="row">
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          borderRadius="m"
          className={
            isSelectedLanguage
              ? 'serverlessSearchSelectClientPanelSelectedBorder'
              : 'serverlessSearchSelectClientPanelBorder'
          }
          onClick={() => setSelectedLanguage(language)}
          color={isSelectedLanguage ? 'primary' : 'plain'}
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
              <EuiText textAlign="center" color={isSelectedLanguage ? 'default' : 'subdued'}>
                <h5>{language.name}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
