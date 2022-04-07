/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { capitalize } from 'lodash';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { HeaderSection } from '../../../../common/components/header_section';

import { SEVERITY_COLOR } from '../util';
import * as i18n from '../translations';
import { useRuleAlertsItems, RuleAlertsItem } from './rule_alerts_items';
import { useNavigation, NavigateTo, GetAppUrl } from '../../../../common/lib/kibana';
import { encodeRisonUrlState } from '../../../../common/components/url_state/helpers';
import { SecurityPageName } from '../../../../../common/constants';
import { useQueryToggle } from '../../../../common/containers/query_toggle';

export interface RuleAlertsTableProps {
  signalIndexName: string | null;
}

export type GetTableColumns = (params: {
  getAppUrl: GetAppUrl;
  navigateTo: NavigateTo;
}) => Array<EuiBasicTableColumn<RuleAlertsItem>>;

const DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID =
  'detection-response-rule-alerts-severity-table' as const;

export const getTableColumns: GetTableColumns = ({ getAppUrl, navigateTo }) => [
  {
    field: 'name',
    name: i18n.RULE_ALERTS_COLUMN_RULE_NAME,
    render: (name: string, { id }) => {
      const url = getAppUrl({ deepLinkId: SecurityPageName.rules, path: `id/${id}` });
      return (
        <EuiToolTip data-test-subj={`${id}-tooltip`} content={i18n.OPEN_RULE_DETAIL_TOOLTIP}>
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
    render: (lastAlertAt: string) => (
      <FormattedRelative
        data-test-subj="severityRuleAlertsTable-lastAlertAt"
        value={new Date(lastAlertAt)}
      />
    ),
  },
  {
    field: 'alert_count',
    name: i18n.RULE_ALERTS_COLUMN_ALERT_COUNT,
    render: (alertCount: number, { id }) => {
      const queryParameter = encodeRisonUrlState({
        language: 'kuery',
        query: `kibana.alert.rule.uuid: ${id}`,
      });
      const url = getAppUrl({
        deepLinkId: SecurityPageName.alerts,
        path: `?query=${queryParameter}`,
      });
      return (
        <EuiToolTip data-test-subj={`${id}-tooltip`} content={i18n.OPEN_RULE_ALERTS_TOOLTIP}>
          <EuiLink
            data-test-subj="severityRuleAlertsTable-alerts"
            // Doing a hard redirect using href only, due to this bug https://github.com/elastic/kibana/issues/123838
            // TODO: Uncomment the onClick function and change the parameter to "?filters=" when the bug is fixed.
            href={url}
            // onClick={(ev?: React.MouseEvent) => {
            //   if (ev) {
            //     ev.preventDefault();
            //   }
            //   navigateTo({ url });
            // }}
          >
            {alertCount}
          </EuiLink>
        </EuiToolTip>
      );
    },
  },
  {
    field: 'severity',
    name: i18n.RULE_ALERTS_COLUMN_SEVERITY,
    render: (severity: Severity) => (
      <EuiHealth color={SEVERITY_COLOR[severity]}>{capitalize(severity)}</EuiHealth>
    ),
  },
];

export const RuleAlertsTable = React.memo<RuleAlertsTableProps>(({ signalIndexName }) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID);
  const { items, isLoading } = useRuleAlertsItems({
    signalIndexName,
    queryId: DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID,
    skip: !toggleStatus,
  });

  const columns = useMemo(
    () => getTableColumns({ getAppUrl, navigateTo }),
    [getAppUrl, navigateTo]
  );

  return (
    <EuiPanel hasBorder data-test-subj="ruleAlertsTablePanel">
      <HeaderSection
        id={DETECTION_RESPONSE_RULE_ALERTS_QUERY_ID}
        title={i18n.RULE_ALERTS_SECTION_TITLE}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        hideSubtitle
      />
      {toggleStatus &&
        // (isLoading || items.length > 0 ? (
          <>
            <EuiBasicTable
              data-test-subj="ruleAlertsTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            <EuiButton
              data-test-subj="ruleAlertsTable-openAlertsButton"
              onClick={() => {
                navigateTo({ deepLinkId: SecurityPageName.alerts });
              }}
            >
              {i18n.OPEN_ALL_ALERTS_BUTTON}
            </EuiButton>
          </>
        // ) : (
        //   <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
        // ))
        }
    </EuiPanel>
  );
});
RuleAlertsTable.displayName = 'RuleAlertsTable';
