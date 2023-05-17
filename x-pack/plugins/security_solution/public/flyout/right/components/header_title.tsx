/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { DocumentSeverity } from './severity';
import { RiskScore } from './risk_score';
import { DOCUMENT_DETAILS } from './translations';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { ShareButton } from './share_button';

/**
 * Document details flyout right section header
 */
export const HeaderTitle: FC = memo(() => {
  const { dataFormattedForFieldBrowser } = useRightPanelContext();
  const { isAlert, ruleName, timestamp, alertUrl } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );

  return (
    <>
      <EuiTitle size="s" data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <h4>{isAlert && !isEmpty(ruleName) ? ruleName : DOCUMENT_DETAILS}</h4>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isAlert && alertUrl && <ShareButton alertUrl={alertUrl} />}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem grow={false}>
          <DocumentSeverity />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskScore />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
