/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../../hooks';

export function NoMonitorsFound() {
  return (
    <EuiEmptyPrompt
      iconType="search"
      iconColor="subdued"
      title={<span>{NO_MONITORS_FOUND_HEADING}</span>}
      titleSize="s"
      body={
        <EuiText size="s">
          {NO_MONITORS_FOUND_CONTENT} <ClearFilters />
        </EuiText>
      }
    />
  );
}

export function ClearFilters() {
  const [_, updateUrlParams] = useUrlParams();
  return <EuiLink onClick={() => updateUrlParams(null)}>{CLEAR_FILTERS_LABEL}</EuiLink>;
}

const NO_MONITORS_FOUND_HEADING = i18n.translate(
  'xpack.synthetics.overview.noMonitorsFoundHeading',
  {
    defaultMessage: 'No monitors found',
  }
);

const NO_MONITORS_FOUND_CONTENT = i18n.translate(
  'xpack.synthetics.overview.noMonitorsFoundContent',
  {
    defaultMessage: 'Try refining your search.',
  }
);

const CLEAR_FILTERS_LABEL = i18n.translate('xpack.synthetics.overview.overview.clearFilters', {
  defaultMessage: 'Clear filters',
});
