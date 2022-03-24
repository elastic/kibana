/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useLocation } from 'react-router-dom';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LightbulbIcon } from '../../../../shared/icons';
import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { useLocalStorage } from '../../../../shared/use_local_storage';

interface SuggestionsCalloutProps {
  title: string;
  description: string;
  buttonTo: string;
  lastUpdatedTimestamp: string; // ISO string like '2021-10-04T18:53:02.784Z'
  style?: React.CSSProperties;
}

export const SuggestionsCallout: React.FC<SuggestionsCalloutProps> = ({
  title,
  description,
  buttonTo,
  lastUpdatedTimestamp,
  style,
}) => {
  const { pathname } = useLocation();

  const [lastDismissedTimestamp, setLastDismissedTimestamp] = useLocalStorage<string>(
    `suggestions-callout--${pathname}`,
    new Date(0).toISOString()
  );

  if (new Date(lastDismissedTimestamp) >= new Date(lastUpdatedTimestamp)) {
    return null;
  }

  return (
    <>
      <EuiCallOut style={style} color="success" iconType={LightbulbIcon} title={title}>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonTo to={buttonTo} color="success" fill size="s">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsCallout.reviewSuggestionsButtonLabel',
                { defaultMessage: 'Review suggestions' }
              )}
            </EuiButtonTo>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="success"
              iconType="eyeClosed"
              size="s"
              onClick={() => {
                setLastDismissedTimestamp(new Date().toISOString());
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.suggestionsCallout.hideForNowLabel',
                { defaultMessage: 'Hide this for now' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
};
