/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { InnerLinkPanel, LinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { Link } from '../link_panel/link';
import * as i18n from './translations';
import { NavigateToHost } from './navigate_to_host';
import { HostRiskScoreQueryId } from '../../../risk_score/containers';
import { useKibana } from '../../../common/lib/kibana';
import { RISKY_HOSTS_DASHBOARD_TITLE } from '../../../hosts/pages/navigation/constants';
import { useDashboardButtonHref } from '../../../common/hooks/use_dashboard_button_href';
import { ImportSavedObjectsButton } from '../../../common/components/create_prebuilt_saved_objects/components/bulk_create_button';
import { VIEW_DASHBOARD } from '../overview_cti_links/translations';

const columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>> = [
  {
    name: 'Host Name',
    field: 'title',
    sortable: true,
    truncateText: true,
    width: '55%',
    render: (name) => (<NavigateToHost name={name} />) as JSX.Element,
  },
  {
    align: 'right',
    field: 'count',
    name: 'Risk Score',
    render: (riskScore) =>
      Number.isNaN(riskScore) ? riskScore : Number.parseFloat(riskScore).toFixed(2),
    sortable: true,
    truncateText: true,
    width: '15%',
  },
  {
    field: 'copy',
    name: 'Current Risk',
    sortable: true,
    truncateText: true,
    width: '15%',
  },
  {
    field: 'path',
    name: '',
    render: (path: string) => (<Link path={path} copy={i18n.LINK_COPY} />) as JSX.Element,
    truncateText: true,
    width: '80px',
  },
];

const warningPanel = (
  <InnerLinkPanel
    color={'warning'}
    title={i18n.WARNING_TITLE}
    body={i18n.WARNING_BODY}
    dataTestSubj="risky-hosts-inner-panel-warning"
  />
);

export const RiskyHostsPanelView: React.FC<LinkPanelViewProps> = ({
  isInspectEnabled,
  listItems,
  splitPanel,
  totalCount = 0,
  to,
  from,
}) => {
  const splitPanelElement =
    typeof splitPanel === 'undefined'
      ? listItems.length === 0
        ? warningPanel
        : undefined
      : splitPanel;

  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const { buttonHref } = useDashboardButtonHref({
    to,
    from,
    title: RISKY_HOSTS_DASHBOARD_TITLE,
  });
  const {
    services: { dashboard },
  } = useKibana();

  const onImportDashboardSuccessCallback = useCallback(
    (response) => {
      const targetDashboard = response.find(
        (obj) => obj.type === 'dashboard' && obj.attributes.title === 'Current Risk Score for Hosts'
      );

      const fetchDashboardUrl = async (targetDashboardId: string | null | undefined) => {
        if (to && from && targetDashboardId) {
          const targetUrl = await dashboard?.locator?.getUrl({
            dashboardId: targetDashboardId,
            timeRange: {
              to,
              from,
            },
          });

          setDashboardUrl(targetUrl ?? null);
        }
      };

      fetchDashboardUrl(targetDashboard?.id);
    },
    [dashboard?.locator, from, to]
  );

  return (
    <LinkPanel
      {...{
        button: (
          <ImportSavedObjectsButton
            href={buttonHref || dashboardUrl}
            ishostRiskScoreDataAvailable={listItems.length > 0}
            onSuccessCallback={onImportDashboardSuccessCallback}
            successTitle={VIEW_DASHBOARD}
            title={i18n.IMPORT_DASHBOARD}
            tooltip={i18n.IMPORT_DASHBOARD_TOOLTIP}
          />
        ),
        columns,
        dataTestSubj: 'risky-hosts-dashboard-links',
        defaultSortField: 'count',
        defaultSortOrder: 'desc',
        inspectQueryId: isInspectEnabled ? HostRiskScoreQueryId.OVERVIEW_RISKY_HOSTS : undefined,
        listItems,
        panelTitle: i18n.PANEL_TITLE,
        splitPanel: splitPanelElement,
        subtitle: useMemo(
          () => (
            <FormattedMessage
              data-test-subj="risky-hosts-total-event-count"
              defaultMessage="Showing: {totalCount} {totalCount, plural, one {host} other {hosts}}"
              id="xpack.securitySolution.overview.riskyHostsDashboardSubtitle"
              values={{ totalCount }}
            />
          ),
          [totalCount]
        ),
      }}
    />
  );
};
