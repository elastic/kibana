/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { GenAiFields } from './get_genai_fields';
import { GenAiTab } from './genai_tab';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

interface Props {
  isGenAiSpan: boolean;
  genAi: GenAiFields | undefined;
}

export function getGenAiTabContent({ isGenAiSpan, genAi }: Props) {
  if (!isGenAiSpan || !genAi) return undefined;

  return {
    id: 'genai',
    'data-test-subj': 'genAiTab',
    prepend: <TechnicalPreviewBadge icon="flask" />,
    name: i18n.translate('xpack.apm.propertiesTable.tabs.genAi', {
      defaultMessage: 'GenAI',
    }),
    content: (
      <>
        <EuiSpacer size="m" />
        <GenAiTab genAi={genAi} />
      </>
    ),
  };
}
