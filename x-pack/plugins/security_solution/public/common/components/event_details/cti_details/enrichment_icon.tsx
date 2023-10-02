/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';
import { isInvestigationTimeEnrichment } from './helpers';

export const getTooltipTitle = (type: string | undefined) =>
  isInvestigationTimeEnrichment(type)
    ? i18n.INVESTIGATION_ENRICHMENT_TITLE
    : i18n.INDICATOR_ENRICHMENT_TITLE;

export const getTooltipContent = (type: string | undefined) =>
  isInvestigationTimeEnrichment(type)
    ? i18n.INVESTIGATION_TOOLTIP_CONTENT
    : i18n.INDICATOR_TOOLTIP_CONTENT;

export const EnrichmentIcon: React.FC<{ type: string | undefined }> = ({ type }) => {
  return (
    <EuiToolTip content={getTooltipContent(type)}>
      <EuiIcon type="iInCircle" size="m" />
    </EuiToolTip>
  );
};
