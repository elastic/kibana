/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocumentStatus } from './status';
import { DocumentSeverity } from './severity';
import { RiskScore } from './risk_score';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useRightPanelContext } from '../context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { RenderRuleName } from '../../../../timelines/components/timeline/body/renderers/formatted_field_helpers';
import { SIGNAL_RULE_NAME_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';
import { FlyoutTitle } from '../../../shared/components/flyout_title';

/**
 * Document details flyout right section header
 */
export const HeaderTitle: FC = memo(() => {
  const { dataFormattedForFieldBrowser, eventId, scopeId } = useRightPanelContext();
  const { isAlert, ruleName, timestamp, ruleId } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );

  const ruleTitle = useMemo(
    () => (
      <RenderRuleName
        contextId={scopeId}
        eventId={eventId}
        fieldName={SIGNAL_RULE_NAME_FIELD_NAME}
        fieldType={'string'}
        isAggregatable={false}
        isDraggable={false}
        linkValue={ruleId}
        value={ruleName}
        openInNewTab
      >
        <FlyoutTitle
          title={ruleName}
          iconType={'warning'}
          isLink
          data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}
        />
      </RenderRuleName>
    ),
    [ruleName, ruleId, eventId, scopeId]
  );

  const eventTitle = (
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.header.headerTitle"
          defaultMessage="Event details"
        />
      </h2>
    </EuiTitle>
  );

  return (
    <>
      <DocumentSeverity />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      <div data-test-subj={FLYOUT_HEADER_TITLE_TEST_ID}>
        {isAlert && !isEmpty(ruleName) ? ruleTitle : eventTitle}
      </div>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <DocumentStatus />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskScore />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
