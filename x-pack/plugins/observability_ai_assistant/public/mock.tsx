/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ForwardRefExoticComponent } from 'react';
import { mockObservabilityAIAssistantService } from '.';
import { InsightProps } from './components/insight/insight';

function createSetupContract() {
  return {};
}

function createStartContract() {
  return {
    service: mockObservabilityAIAssistantService,
    // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
    ObservabilityAIAssistantActionMenuItem: () => <div>im a button</div>,
    ContextualInsight: (
      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
      <div>I give insight</div>
    ) as unknown as ForwardRefExoticComponent<InsightProps>,
    useGenAIConnectors: () => ({
      loading: false,
      selectConnector: () => {},
      reloadConnectors: () => {},
    }),
  };
}

export const observabilityAIAssistantPluginMock = {
  createSetupContract,
  createStartContract,
};
