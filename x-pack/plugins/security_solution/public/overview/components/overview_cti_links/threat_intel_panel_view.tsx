/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { LinkPanel, InnerLinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { shortenCountIntoString } from '../../../common/utils/shorten_count_into_string';
import { Link } from '../link_panel/link';
import { ID as CTIEventCountQueryId } from '../../containers/overview_cti_links/use_cti_event_counts';
import { LINK_COPY } from '../overview_risky_host_links/translations';

const columns: Array<EuiTableFieldDataColumnType<LinkPanelListItem>> = [
  { name: 'Name', field: 'title', sortable: true, truncateText: true, width: '100%' },
  {
    name: 'Indicator',
    field: 'count',
    render: shortenCountIntoString,
    sortable: true,
    truncateText: true,
    width: '20%',
    align: 'right',
  },
  {
    name: '',
    field: 'path',
    truncateText: true,
    width: '80px',
    render: (path: string) => <Link path={path} copy={LINK_COPY} />,
  },
];

export const ThreatIntelPanelView: React.FC<LinkPanelViewProps> = ({
  buttonHref = '',
  isPluginDisabled,
  isInspectEnabled = true,
  listItems,
  splitPanel,
  totalCount = 0,
}) => {
  const threatIntelDashboardDocLink = `${
    useKibana().services.docLinks.links.filebeat.base
  }/load-kibana-dashboards.html`;

  return (
    <LinkPanel
      {...{
        button: useMemo(
          () => (
            <EuiButton
              href={buttonHref}
              isDisabled={!buttonHref}
              data-test-subj="cti-view-dashboard-button"
              target="_blank"
            >
              {i18n.VIEW_DASHBOARD}
            </EuiButton>
          ),
          [buttonHref]
        ),
        columns,
        dataTestSubj: 'cti-dashboard-links',
        infoPanel: useMemo(
          () =>
            isPluginDisabled ? (
              <InnerLinkPanel
                dataTestSubj="cti-inner-panel-info"
                color={'primary'}
                title={i18n.INFO_TITLE}
                body={i18n.INFO_BODY}
                button={
                  <EuiButton href={threatIntelDashboardDocLink} target="_blank">
                    {i18n.INFO_BUTTON}
                  </EuiButton>
                }
              />
            ) : null,
          [isPluginDisabled, threatIntelDashboardDocLink]
        ),
        inspectQueryId: isInspectEnabled ? CTIEventCountQueryId : undefined,
        listItems,
        panelTitle: i18n.PANEL_TITLE,
        splitPanel,
        subtitle: useMemo(
          () => (
            <FormattedMessage
              data-test-subj="cti-total-event-count"
              defaultMessage="Showing: {totalCount} {totalCount, plural, one {indicator} other {indicators}}"
              id="xpack.securitySolution.overview.ctiDashboardSubtitle"
              values={{ totalCount }}
            />
          ),
          [totalCount]
        ),
      }}
    />
  );
};
