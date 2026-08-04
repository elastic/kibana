/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  GenAiTab,
  GENAI_EBT_CLICK_ACTIONS,
  GENAI_EBT_HOSTS,
  type GenAiEbtProps,
  type GenAiFields,
} from '@kbn/apm-ui-shared';
import { getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';
import { TechnicalPreviewBadge } from '../technical_preview_badge';

/** `data-ebt-element` for copy-button clicks inside the GenAI tab body. */
const GENAI_TAB_BODY_EBT_ELEMENT = 'apmGenAiTab';

/**
 * Single source for the `viewGenAi` click attributes of an APM-hosted GenAI
 * tab — used both for the tab definitions returned here and for surfaces that
 * render their own tab elements (e.g. the trace sample `TransactionTabs`).
 */
export function getGenAiTabEbt(element: string): EbtClickAttrs {
  return {
    action: GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI,
    element,
    detail: GENAI_EBT_HOSTS.APM,
  };
}

interface Props {
  isGenAiSpan: boolean;
  genAi: GenAiFields | undefined;
  /** Identifies the host surface in the `viewGenAi` tab-click EBT events. */
  ebt: GenAiEbtProps;
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
        <GenAiTab genAi={genAi} ebt={{ element: GENAI_TAB_BODY_EBT_ELEMENT }} />
      </>
    ),
  };
}
