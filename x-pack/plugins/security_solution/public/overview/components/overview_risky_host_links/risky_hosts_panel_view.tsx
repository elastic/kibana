/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObject, SavedObjectAttributes } from '@kbn/core/types';
import type { LinkPanelListItem } from '../link_panel';
import { InnerLinkPanel, LinkPanel } from '../link_panel';
import type { LinkPanelViewProps } from '../link_panel/types';
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

const RiskyHostsPanelViewComponent: React.FC<LinkPanelViewProps> = ({
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

  const [dashboardUrl, setDashboardUrl] = useState<string>();
  const { buttonHref } = useDashboardButtonHref({
    to,
    from,
    title: RISKY_HOSTS_DASHBOARD_TITLE,
  });
  const {
    services: { dashboard },
  } = useKibana();

  const onImportDashboardSuccessCallback = useCallback(
    (response: Array<SavedObject<SavedObjectAttributes>>) => {
      const targetDashboard = response.find(
        (obj) => obj.type === 'dashboard' && obj?.attributes?.title === RISKY_HOSTS_DASHBOARD_TITLE
      );

      const fetchDashboardUrl = (targetDashboardId: string | null | undefined) => {
        if (to && from && targetDashboardId) {
          const targetUrl = dashboard?.locator?.getRedirectUrl({
            dashboardId: targetDashboardId,
            timeRange: {
              to,
              from,
            },
          });

          setDashboardUrl(targetUrl);
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
            hide={listItems == null || listItems.length === 0}
            onSuccessCallback={onImportDashboardSuccessCallback}
            successLink={buttonHref || dashboardUrl}
            successTitle={VIEW_DASHBOARD}
            templateName="hostRiskScoreDashboards"
            title={i18n.IMPORT_DASHBOARD}
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

export const RiskyHostsPanelView = React.memo(RiskyHostsPanelViewComponent);
