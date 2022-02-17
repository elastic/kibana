/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiTableFieldDataColumnType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from './translations';
import { LinkPanel, InnerLinkPanel, LinkPanelListItem } from '../link_panel';
import { LinkPanelViewProps } from '../link_panel/types';
import { shortenCountIntoString } from '../../../common/utils/shorten_count_into_string';
import { Link } from '../link_panel/link';
import { ID as CTIEventCountQueryId } from '../../containers/overview_cti_links/use_ti_data_sources';
import { LINK_COPY } from '../overview_risky_host_links/translations';
import { useIntegrationsPageLink } from './use_integrations_page_link';

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
  isInspectEnabled = true,
  listItems,
  splitPanel,
  totalCount = 0,
  allIntegrationsInstalled,
}) => {
  const integrationsLink = useIntegrationsPageLink();

  return (
    <LinkPanel
      {...{
        columns,
        dataTestSubj: 'cti-dashboard-links',
        infoPanel: useMemo(
          () => (
            <>
              {allIntegrationsInstalled === false ? (
                <InnerLinkPanel
                  dataTestSubj="cti-inner-panel-info"
                  color={'warning'}
                  title={i18n.SOME_MODULES_DISABLE_TITLE}
                  body={i18n.DANGER_BODY}
                  button={
                    <EuiButton
                      color="warning"
                      href={integrationsLink}
                      data-test-subj="cti-enable-integrations-button"
                      target="_blank"
                    >
                      {i18n.DANGER_BUTTON}
                    </EuiButton>
                  }
                />
              ) : null}
            </>
          ),
          [allIntegrationsInstalled, integrationsLink]
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
