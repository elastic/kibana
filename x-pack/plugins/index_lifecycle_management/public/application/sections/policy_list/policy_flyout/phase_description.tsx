/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiDescriptionList } from '@elastic/eui';
import { PhaseIndicator } from './phase_indicator';
import { ActionComponentProps } from './components/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

export const PhaseDescription = ({
  phase,
  phases,
  components,
}: ActionComponentProps & {
  components: Array<ComponentType<ActionComponentProps>>;
}) => {
  const title = i18nTexts.editPolicy.titles[phase];
  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <PhaseIndicator phase={phase} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiDescriptionList>
        {components.map((Component, index) => (
          <Component phase={phase} phases={phases} key={index} />
        ))}
      </EuiDescriptionList>
      <EuiSpacer size="l" />
    </>
  );
};
