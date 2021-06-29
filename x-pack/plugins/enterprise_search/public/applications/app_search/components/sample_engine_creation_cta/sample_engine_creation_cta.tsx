/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiButton } from '@elastic/eui';

import {
  SAMPLE_ENGINE_CREATION_CTA_TITLE,
  SAMPLE_ENGINE_CREATION_CTA_DESCRIPTION,
  SAMPLE_ENGINE_CREATION_CTA_BUTTON_LABEL,
} from './i18n';
import { SampleEngineCreationCtaLogic } from './sample_engine_creation_cta_logic';

export const SampleEngineCreationCta: React.FC = () => {
  const { isLoading } = useValues(SampleEngineCreationCtaLogic);
  const { createSampleEngine } = useActions(SampleEngineCreationCtaLogic);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem className="eui-textLeft eui-textNoWrap">
          <EuiTitle size="xs">
            <h3>{SAMPLE_ENGINE_CREATION_CTA_TITLE}</h3>
          </EuiTitle>
          <EuiText size="s">
            <p>{SAMPLE_ENGINE_CREATION_CTA_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={createSampleEngine} isLoading={isLoading}>
            {SAMPLE_ENGINE_CREATION_CTA_BUTTON_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
