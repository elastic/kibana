/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiButton, EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { InnerLinkPanel, LinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { Link } from '../link_panel/link';
import * as i18n from './translations';
import { VIEW_DASHBOARD } from '../overview_cti_links/translations';
import { QUERY_ID as RiskyHostsQueryId } from '../../containers/overview_risky_host_links/use_risky_host_links';

const RiskyHostsDashboardLink: React.FC<{ path?: string }> = (props) => (
  <Link path={props as string} copy={i18n.LINK_COPY} />
);
RiskyHostsDashboardLink.displayName = 'RiskyHostsDashboardLink';

const columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>> = [
  { name: 'Host Name', field: 'title', sortable: true, truncateText: true, width: '100%' },
  {
    name: 'Risk Score',
    field: 'count',
    sortable: true,
    truncateText: true,
    width: '120px',
    align: 'right',
  },
  {
    name: 'Current Risk',
    field: 'copy',
    sortable: true,
    truncateText: true,
    width: '120px',
  },
  {
    name: '',
    field: 'path',
    truncateText: true,
    render: RiskyHostsDashboardLink,
    width: '120px',
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
  buttonHref = '',
  isInspectEnabled,
  listItems,
  splitPanel,
  totalCount = 0,
}) => {
  const splitPanelElement =
    typeof splitPanel === 'undefined'
      ? listItems.length === 0
        ? warningPanel
        : undefined
      : splitPanel;
  return (
    <LinkPanel
      {...{
        dataTestSubj: 'risky-hosts-dashboard-links',
        defaultSortOrder: 'desc',
        defaultSortField: 'count',
        button: useMemo(
          () => (
            <EuiButton
              href={buttonHref}
              isDisabled={!buttonHref}
              data-test-subj="risky-hosts-view-dashboard-button"
              target="_blank"
            >
              {VIEW_DASHBOARD}
            </EuiButton>
          ),
          [buttonHref]
        ),
        columns,
        inspectQueryId: isInspectEnabled ? RiskyHostsQueryId : undefined,
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
