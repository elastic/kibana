/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButton, EuiLoadingSpinner, EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { InnerLinkPanel, LinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { Link } from '../link_panel/link';
import * as i18n from './translations';
import { IMPORT_DASHBOARD, VIEW_DASHBOARD } from '../overview_cti_links/translations';
import { NavigateToHost } from './navigate_to_host';
import { HostRiskScoreQueryId } from '../../../risk_score/containers';
import { importFile } from '../link_panel/import_file';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { useSpaceId } from '../../../risk_score/containers/common';
import { useRiskyHostsDashboardButtonHref } from '../../containers/overview_risky_host_links/use_risky_hosts_dashboard_button_href';

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
  const [response, setResponse] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(undefined);
  const spaceId = useSpaceId();
  const { buttonHref } = useRiskyHostsDashboardButtonHref(to, from);

  const {
    services: { http },
  } = useKibana();
  const toasts = useToasts();

  const importMyFile = useCallback(async () => {
    setStatus('loading');

    try {
      const res = await importFile(http);
      setResponse(res);
      setStatus('success');

      toasts.addSuccess(
        response.data.createDashboards.message.saved_objects
          .map((o, idx) => `${idx + 1}. ) ${o?.attributes?.title ?? o?.attributes?.name}`)
          .join(' ,')
      );
    } catch (e) {
      setStatus('error');
      setError({
        status: 'error',
        error: e.message,
      });
    }
  }, [http, response?.data?.createDashboards?.message?.saved_objects, toasts]);

  return (
    <LinkPanel
      {...{
        button: useMemo(
          () =>
            buttonHref || status === 'sccess' ? (
              <EuiButton
                href={buttonHref}
                isDisabled={!buttonHref}
                data-test-subj="risky-hosts-view-dashboard-button"
                target="_blank"
              >
                {VIEW_DASHBOARD}
              </EuiButton>
            ) : (
              <EuiButton
                onClick={importMyFile}
                color="warning"
                target="_blank"
                isDisabled={status === 'loading'}
                data-test-subj={`risky-host-import-module-button`}
              >
                {status === 'loading' && <EuiLoadingSpinner size="m" />} {IMPORT_DASHBOARD}
              </EuiButton>
            ),
          [buttonHref, importMyFile, status]
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
