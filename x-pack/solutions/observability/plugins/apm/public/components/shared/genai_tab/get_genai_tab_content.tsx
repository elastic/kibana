/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { GenAiTab, GenAiTabImpression, type GenAiFields } from '@kbn/apm-ui-shared';
import { getEbtProps, type EbtClickAttrsElementOnly } from '@kbn/ebt-click';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { TechnicalPreviewBadge } from '../technical_preview_badge';
import { GENAI_TAB_EBT_ELEMENTS, getGenAiTabEbt } from './ebt_constants';

interface Props {
  isGenAiSpan: boolean;
  genAi: GenAiFields | undefined;
  /**
   * Identifies the host surface in the `viewGenAi` tab-click EBT events and
   * in the `genai_tab_impression` events.
   */
  ebt: EbtClickAttrsElementOnly;
  /** Used to report a `genai_tab_impression` event when the tab is rendered. */
  reportEvent: AnalyticsServiceStart['reportEvent'];
  /** Span/transaction id; dedupes impression reporting per document. */
  resourceId?: string;
}

export function getGenAiTabContent({ isGenAiSpan, genAi, ebt, reportEvent, resourceId }: Props) {
  if (!isGenAiSpan || !genAi) return undefined;

  return {
    id: 'genai',
    'data-test-subj': 'genAiTab',
    prepend: (
      <>
        <GenAiTabImpression
          reportEvent={reportEvent}
          element={ebt.element}
          resourceId={resourceId}
        />
        <TechnicalPreviewBadge icon="flask" />
      </>
    ),
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
