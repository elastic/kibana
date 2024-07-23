/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiPanel, useEuiTheme, EuiLink } from '@elastic/eui';
import { css } from '@emotion/css';
import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { DocumentStatus } from './status';
import { DocumentSeverity } from './severity';
import { RiskScore } from './risk_score';
import { useRefetchByScope } from '../../../../timelines/components/side_panel/event_details/flyout/use_refetch_by_scope';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FLYOUT_ALERT_HEADER_TITLE_TEST_ID, ALERT_SUMMARY_PANEL_TEST_ID } from './test_ids';
import { Assignees } from './assignees';
import { FlyoutTitle } from '../../../shared/components/flyout_title';

/**
 * Alert details flyout right section header
 */
export const AlertHeaderTitle = memo(() => {
  const {
    dataFormattedForFieldBrowser,
    eventId,
    scopeId,
    isPreview,
    refetchFlyoutData,
    getFieldsData,
  } = useDocumentDetailsContext();
  const { isAlert, ruleName, timestamp, ruleId } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const { euiTheme } = useEuiTheme();

  const href = useRuleDetailsLink({ ruleId: !isPreview ? ruleId : null });
  const ruleTitle = useMemo(
    () =>
      href ? (
        <EuiLink href={href} target="_blank" external={false}>
          <FlyoutTitle
            title={ruleName}
            iconType={'warning'}
            isLink
            data-test-subj={FLYOUT_ALERT_HEADER_TITLE_TEST_ID}
          />
        </EuiLink>
      ) : (
        <FlyoutTitle
          title={ruleName}
          iconType={'warning'}
          data-test-subj={FLYOUT_ALERT_HEADER_TITLE_TEST_ID}
        />
      ),
    [ruleName, href]
  );

  const { refetch } = useRefetchByScope({ scopeId });
  const alertAssignees = useMemo(
    () => (getFieldsData(ALERT_WORKFLOW_ASSIGNEE_IDS) as string[]) ?? [],
    [getFieldsData]
  );
  const onAssigneesUpdated = useCallback(() => {
    refetch();
    refetchFlyoutData();
  }, [refetch, refetchFlyoutData]);

  return (
    <>
      <DocumentSeverity />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      {isAlert && ruleName ? (
        ruleTitle
      ) : (
        <FlyoutTitle
          title={i18n.translate('xpack.securitySolution.flyout.right.header.headerTitle', {
            defaultMessage: 'Document details',
          })}
          iconType={'warning'}
          data-test-subj={FLYOUT_ALERT_HEADER_TITLE_TEST_ID}
        />
      )}
      <EuiSpacer size="m" />
      <EuiPanel
        hasShadow={false}
        hasBorder
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.s};
        `}
        data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
      >
        <EuiFlexGroup direction="row" gutterSize="m" responsive={false}>
          <EuiFlexItem
            css={css`
              border-right: ${euiTheme.border.thin};
            `}
          >
            <DocumentStatus />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              border-right: ${euiTheme.border.thin};
            `}
          >
            <RiskScore />
          </EuiFlexItem>
          <EuiFlexItem>
            <Assignees
              eventId={eventId}
              assignedUserIds={alertAssignees}
              onAssigneesUpdated={onAssigneesUpdated}
              isPreview={isPreview}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
});

AlertHeaderTitle.displayName = 'AlertHeaderTitle';
