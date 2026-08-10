/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { GenAiTab, type GenAiFields } from '@kbn/apm-ui-shared';
import { getEbtProps, type EbtClickAttrsElementOnly } from '@kbn/ebt-click';
import { TechnicalPreviewBadge } from '../technical_preview_badge';
import { GENAI_TAB_EBT_ELEMENTS, getGenAiTabEbt } from './ebt_constants';

interface Props {
  isGenAiSpan: boolean;
  genAi: GenAiFields | undefined;
  /** Identifies the host surface in the `viewGenAi` tab-click EBT events. */
  ebt: EbtClickAttrsElementOnly;
}

export function getGenAiTabContent({ isGenAiSpan, genAi, ebt }: Props) {
  if (!isGenAiSpan || !genAi) return undefined;

  return {
    id: 'genai',
    'data-test-subj': 'genAiTab',
    prepend: <TechnicalPreviewBadge icon="flask" />,
    name: i18n.translate('xpack.apm.propertiesTable.tabs.genAi', {
      defaultMessage: 'GenAI',
    }),
    ...getEbtProps(getGenAiTabEbt(ebt.element)),
    content: (
      <>
        <EuiSpacer size="m" />
        <GenAiTab genAi={genAi} ebt={{ element: GENAI_TAB_EBT_ELEMENTS.TAB_BODY }} />
      </>
    ),
  };
}
