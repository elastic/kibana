/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import {
  EuiSpacer,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { KqlMode } from '../../../store/local/timeline/model';
import * as i18n from './translations';

interface ModeProperties {
  mode: KqlMode;
  description: string;
  kqlBarTooltip: string;
  placeholder: string;
  selectText: string;
}

export const modes: { [key in KqlMode]: ModeProperties } = {
  filter: {
    mode: 'filter',
    description: i18n.FILTER_DESCRIPTION,
    kqlBarTooltip: i18n.FILTER_KQL_TOOLTIP,
    placeholder: i18n.FILTER_KQL_PLACEHOLDER,
    selectText: i18n.FILTER_KQL_SELECTED_TEXT,
  },
  search: {
    mode: 'search',
    description: i18n.SEARCH_DESCRIPTION,
    kqlBarTooltip: i18n.SEARCH_KQL_TOOLTIP,
    placeholder: i18n.SEARCH_KQL_PLACEHOLDER,
    selectText: i18n.SEARCH_KQL_SELECTED_TEXT,
  },
};

export const options = [
  {
    value: modes.filter.mode,
    inputDisplay: modes.filter.selectText,
    dropdownDisplay: (
      <>
        <strong>{modes.filter.selectText}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">{modes.filter.description}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: modes.search.mode,
    inputDisplay: modes.search.selectText,
    dropdownDisplay: (
      <>
        <strong>{modes.search.selectText}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">{modes.search.description}</p>
        </EuiText>
      </>
    ),
  },
];
