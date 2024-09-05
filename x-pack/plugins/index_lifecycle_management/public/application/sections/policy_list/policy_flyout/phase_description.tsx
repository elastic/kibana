/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
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
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      {components.map((Component) => (
        <Component phase={phase} phases={phases} />
      ))}
      <EuiSpacer size="l" />
    </>
  );
};
