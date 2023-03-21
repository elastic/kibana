/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { capitalize } from 'lodash';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { HeaderSection } from '../../../../common/components/header_section';

import { openAlertsFilter, SEVERITY_COLOR } from '../utils';
import * as i18n from '../translations';
import type { RuleAlertsItem } from './use_rule_alerts_items';
import { useRuleAlertsItems } from './use_rule_alerts_items';
import type { NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import { useNavigation } from '../../../../common/lib/kibana';
import { SecurityPageName } from '../../../../../common/constants';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INSPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { useNavigateToTimeline } from '../hooks/use_navigate_to_timeline';

export interface RuleAlertsTableProps {
  signalIndexName: string | null;
}

export type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
  openRuleInTimeline: (ruleName: string) => void;
}) => Array<EuiBasicTableColumn<RuleAlertsItem>>;

const DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID =
  'detection-response-rule-alerts-severity-table' as const;

export const getTableColumns: GetTableColumns = ({ getAppUrl, navigateTo, openRuleInTimeline }) => [
  {
    field: 'name',
    name: i18n.RULE_ALERTS_COLUMN_RULE_NAME,
    render: (name: string, { id }) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.rules, path: `id/${id}` });
      return (
        <EuiToolTip
          data-test-subj={`${id}-tooltip`}
          title={i18n.OPEN_RULE_DETAIL_TOOLTIP}
          content={name}
          anchorClassName="eui-textTruncate"
        >
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiLink
            data-test-subj="severityRuleAlertsTable-name"
            href={url}
            onClick={(ev?: React.MouseEvent) => {
              if (ev) {
                ev.preventDefault();
              }
              navigateTo({ url });
            }}
          >
            {name}
          </EuiLink>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'last_alert_at',
    name: i18n.RULE_ALERTS_COLUMN_LAST_ALERT,
    'data-test-subj': 'severityRuleAlertsTable-lastAlertAt',
    render: (lastAlertAt: string) => <FormattedRelative value={new Date(lastAlertAt)} />,
  },
  {
    field: 'alert_count',
    name: i18n.RULE_ALERTS_COLUMN_ALERT_COUNT,
    'data-test-subj': 'severityRuleAlertsTable-alertCount',
    render: (alertCount: number, { name }) => (
      <EuiLink
        data-test-subj="severityRuleAlertsTable-alertCountLink"
        disabled={alertCount === 0}
        onClick={() => openRuleInTimeline(name)}
      >
        <FormattedCount count={alertCount} />
      </EuiLink>
    ),
  },
  {
    field: 'severity',
    name: i18n.RULE_ALERTS_COLUMN_SEVERITY,
    'data-test-subj': 'severityRuleAlertsTable-severity',
    render: (severity: Severity) => (
      <EuiHealth color={SEVERITY_COLOR[severity]}>{capitalize(severity)}</EuiHealth>
    ),
  },
];

export const RuleAlertsTable = React.memo<RuleAlertsTableProps>(({ signalIndexName }) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID);
  const { items, isLoading, updatedAt } = useRuleAlertsItems({
    signalIndexName,
    queryId: DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID,
    skip: !toggleStatus,
  });

  const { openTimelineWithFilters } = useNavigateToTimeline();

  const openRuleInTimeline = useCallback(
    (ruleName: string) => {
      openTimelineWithFilters([
        [{ field: 'kibana.alert.rule.name', value: ruleName }, openAlertsFilter],
      ]);
    },
    [openTimelineWithFilters]
  );

  const navigateToAlerts = useCallback(() => {
    navigateTo({ deepLinkId: SecurityPageName.alerts });
  }, [navigateTo]);

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo, openRuleInTimeline }),
    [getAppUrl, navigateTo, openRuleInTimeline]
  );

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INSPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityRuleAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID}
          title={i18n.RULE_ALERTS_SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="severityRuleAlertsTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            <EuiButton data-test-subj="severityRuleAlertsButton" onClick={navigateToAlerts}>
              {i18n.OPEN_ALL_ALERTS_BUTTON}
            </EuiButton>
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});
RuleAlertsTable.displayName = 'RuleAlertsTable';
