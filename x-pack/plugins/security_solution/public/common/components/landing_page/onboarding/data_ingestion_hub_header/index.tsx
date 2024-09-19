/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classnames from 'classnames';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  GET_STARTED_PAGE_TITLE,
  GET_STARTED_DATA_INGESTION_HUB_DESCRIPTION,
  GET_STARTED_DATA_INGESTION_HUB_SUBTITLE,
} from '../translations';
import { useCurrentUser } from '../../../../lib/kibana';
import { useDataIngestionHubHeaderStyles } from './index.styles';
import { useHeaderCards } from './cards/header_cards';

export const DataIngestionHubHeader: React.FC = React.memo(() => {
  const userName = useCurrentUser();
  const headerCards = useHeaderCards();

  const {
    headerContentStyles,
    headerImageStyles,
    headerTitleStyles,
    headerSubtitleStyles,
    headerDescriptionStyles,
  } = useDataIngestionHubHeaderStyles();

  // Full name could be null, user name should always exist
  const name = userName?.fullName || userName?.username;

  const headerSubtitleClassNames = classnames('eui-displayBlock', headerSubtitleStyles);
  const headerDescriptionClassNames = classnames('eui-displayBlock', headerDescriptionStyles);

  return (
    <>
      <EuiFlexGroup
        data-test-subj="data-ingestion-hub-header"
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem
          data-test-subj="data-ingestion-hub-header-image"
          grow={false}
          className={headerImageStyles}
        />
        <EuiFlexItem grow={false} className={headerContentStyles}>
          {name && (
            <EuiTitle
              size="l"
              className={headerTitleStyles}
              data-test-subj="data-ingestion-hub-header-greetings"
            >
              <span>{GET_STARTED_PAGE_TITLE(name)}</span>
            </EuiTitle>
          )}
          <EuiSpacer size="s" />
          <h1 className={headerSubtitleClassNames}>{GET_STARTED_DATA_INGESTION_HUB_SUBTITLE}</h1>
          <EuiSpacer size="s" />
          <span className={headerDescriptionClassNames}>
            {GET_STARTED_DATA_INGESTION_HUB_DESCRIPTION}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup
        data-test-subj="data-ingestion-hub-header-cards"
        justifyContent="center"
        alignItems="center"
        wrap
      >
        {headerCards.map((card, i) => (
          <EuiFlexItem key={i}>{card}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
});

DataIngestionHubHeader.displayName = 'DataIngestionHubHeader';
