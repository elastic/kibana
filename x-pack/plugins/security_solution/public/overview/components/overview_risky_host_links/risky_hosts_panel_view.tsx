/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getOr } from 'lodash/fp';
import { SavedObjectsImportSuccess } from '@kbn/core/public';
import { InnerLinkPanel, LinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { Link } from '../link_panel/link';
import * as i18n from './translations';
import { VIEW_DASHBOARD } from '../overview_cti_links/translations';
import { NavigateToHost } from './navigate_to_host';
import { HostRiskScoreQueryId } from '../../../risk_score/containers';
import { importFile } from '../link_panel/import_file';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { useRiskyHostsDashboardButtonHref } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';
import { RISKY_HOSTS_DASHBOARD_TITLE } from '../../../hosts/pages/navigation/constants';

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

  const [response, setResponse] = useState<SavedObjectsImportSuccess[] | null>(null);
  const [status, setStatus] = useState('idle');
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [error, setError] = useState(undefined);
  const { buttonHref } = useRiskyHostsDashboardButtonHref({
    to,
    from,
    title: RISKY_HOSTS_DASHBOARD_TITLE,
  });
  const {
    services: { http, dashboard },
  } = useKibana();
  const toasts = useToasts();

  const importMyFile = useCallback(async () => {
    setStatus('loading');

    try {
      const res = await importFile(http);
      const savedObjects = getOr([], ['data', 'createDashboards', 'message', 'saved_objects'], res);
      setResponse(savedObjects);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e);
    }
  }, [http]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onMouseEnter = () => {
    setIsPopoverOpen(true);
  };

  const closePopover = () => setIsPopoverOpen(false);

  useEffect(() => {
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

    if (status === 'success') {
      const targetDashboard = (response ?? []).find(
        (obj) => obj.type === 'dashboard' && obj.attributes.title === 'Current Risk Score for Hosts'
      );

      fetchDashboardUrl(targetDashboard?.id);
    }
  }, [dashboard?.locator, from, response, status, to]);

  useEffect(() => {
    const res = response ?? [];
    if (status === 'success' && response != null) {
      toasts.addSuccess(
        `${i18n.IMPORT_DASHBOARD_SUCCESS(res.length)}: ${(response ?? [])
          .map((o, idx) => `${idx + 1}. ) ${o?.attributes?.title ?? o?.attributes?.name}`)
          .join(' ,')}`
      );
    }

    if (status === 'error' && error != null) {
      toasts.addError(error, { title: 'Import dashboard failed', toastMessage: error.message });
    }
  }, [dashboard?.locator, error, from, response, status, to, toasts]);

  return (
    <LinkPanel
      {...{
        button: useMemo(
          () =>
            dashboardUrl || buttonHref || status === 'sccess' ? (
              <EuiButton
                href={(buttonHref || dashboardUrl) ?? undefined}
                isDisabled={!buttonHref && !dashboardUrl}
                data-test-subj="risky-hosts-view-dashboard-button"
                target="_blank"
              >
                {VIEW_DASHBOARD}
              </EuiButton>
            ) : listItems.length > 0 ? (
              <EuiButton
                onClick={importMyFile}
                color="warning"
                target="_blank"
                isDisabled={status === 'loading'}
                data-test-subj={`risky-host-import-module-button`}
              >
                {status === 'loading' && <EuiLoadingSpinner size="m" />} {i18n.IMPORT_DASHBOARD}
              </EuiButton>
            ) : (
              <EuiPopover
                isOpen={isPopoverOpen}
                closePopover={closePopover}
                button={
                  <EuiButton
                    onMouseEnter={onMouseEnter}
                    color="warning"
                    target="_blank"
                    isDisabled={true}
                    data-test-subj={`risky-host-disabled-import-module-button`}
                  >
                    {i18n.IMPORT_DASHBOARD}
                  </EuiButton>
                }
              >
                {i18n.IMPORT_DASHBOARD_TOOLTIP}
              </EuiPopover>
            ),
          [buttonHref, dashboardUrl, importMyFile, isPopoverOpen, listItems.length, status]
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
