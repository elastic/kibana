/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { pure } from 'recompose';
import chrome from 'ui/chrome';

import { HeaderPage } from '../../components/header_page';
import { OverviewHost } from '../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../components/page/overview/overview_network';
import { GlobalTime } from '../../containers/global_time';

import { Summary } from './summary';
import { EmptyPage } from '../../components/empty_page';
import { WithSource, indicesExistOrDataTemporarilyUnavailable } from '../../containers/source';
import { IndexType } from '../../graphql/types';

import * as i18n from './translations';

const basePath = chrome.getBasePath();

const indexTypes = [IndexType.FILEBEAT, IndexType.AUDITBEAT, IndexType.PACKETBEAT];

export const OverviewComponent = pure(() => {
  const dateEnd = Date.now();
  const dateRange = moment.duration(24, 'hours').asMilliseconds();
  const dateStart = dateEnd - dateRange;

  return (
    <WithSource sourceId="default" indexTypes={indexTypes}>
      {({ auditbeatIndicesExist, filebeatIndicesExist }) =>
        indicesExistOrDataTemporarilyUnavailable(auditbeatIndicesExist) &&
        indicesExistOrDataTemporarilyUnavailable(filebeatIndicesExist) ? (
          <>
            <HeaderPage subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE} />

            <GlobalTime>
              {({ setQuery }) => (
                <EuiFlexGroup>
                  <Summary />
                  <OverviewHost endDate={dateEnd} startDate={dateStart} setQuery={setQuery} />
                  <OverviewNetwork endDate={dateEnd} startDate={dateStart} setQuery={setQuery} />
                </EuiFlexGroup>
              )}
            </GlobalTime>
          </>
        ) : (
          <EmptyPage
            title={i18n.NO_FILEBEAT_INDICES}
            message={i18n.LETS_ADD_SOME}
            actionLabel={i18n.SETUP_INSTRUCTIONS}
            actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/security`}
          />
        )
      }
    </WithSource>
  );
});
