/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchRequest } from '../../../../typings/elasticsearch';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ApmIndicesName } from '../../settings/apm_indices/get_apm_indices';

export enum APMUIDocumentType {
  agentConfiguration = 'agentConfiguration',
  customLink = 'customLink',
}

export type APMDocumentType = ProcessorEvent | APMUIDocumentType;

export type APMESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    types: APMDocumentType[];
  };
};

type DocumentTypeSettings = Record<
  APMDocumentType,
  {
    apmIndicesName: ApmIndicesName;
    type: 'processor_event' | 'ui_document_type';
  }
>;

export const documentTypeSettings: DocumentTypeSettings = {
  [ProcessorEvent.transaction]: {
    apmIndicesName: 'apm_oss.transactionIndices',
    type: 'processor_event',
  },
  [ProcessorEvent.span]: {
    apmIndicesName: 'apm_oss.spanIndices',
    type: 'processor_event',
  },
  [ProcessorEvent.metric]: {
    apmIndicesName: 'apm_oss.metricsIndices',
    type: 'processor_event',
  },
  [ProcessorEvent.error]: {
    apmIndicesName: 'apm_oss.errorIndices',
    type: 'processor_event',
  },
  [ProcessorEvent.sourcemap]: {
    apmIndicesName: 'apm_oss.sourcemapIndices',
    type: 'processor_event',
  },
  [ProcessorEvent.onboarding]: {
    apmIndicesName: 'apm_oss.onboardingIndices',
    type: 'processor_event',
  },
  [APMUIDocumentType.agentConfiguration]: {
    apmIndicesName: 'apmAgentConfigurationIndex',
    type: 'ui_document_type',
  },
  [APMUIDocumentType.customLink]: {
    apmIndicesName: 'apmCustomLinkIndex',
    type: 'ui_document_type',
  },
};
