/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo, useState } from 'react';

import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '../../../util/url_state';
import { DataFrameAnalyticsList } from './components/analytics_list';
import { useRefreshInterval } from './components/analytics_list/use_refresh_interval';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { JobMap } from '../job_map';
import { usePageUrlState } from '../../../util/url_state';
import { ListingPageUrlState } from '../../../../../common/types/common';
import { DataFrameAnalyticsListColumn } from './components/analytics_list/common';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';
import { MlPageHeader } from '../../../components/page_header';

export const getDefaultDFAListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: DataFrameAnalyticsListColumn.id,
  sortDirection: 'asc',
});

export const Page: FC = () => {
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [globalState] = useUrlState('_g');

  const [dfaPageState, setDfaPageState] = usePageUrlState(
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    getDefaultDFAListState()
  );

  useRefreshInterval(setBlockRefresh);
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });

  const location = useLocation();
  const selectedTabId = useMemo(() => location.pathname.split('/').pop(), [location]);
  const mapJobId = globalState?.ml?.jobId;
  const mapModelId = globalState?.ml?.modelId;
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsList.title"
          defaultMessage="Data Frame Analytics Jobs"
        />
      </MlPageHeader>

      <NodeAvailableWarning />

      <SavedObjectsWarning
        mlSavedObjectType="data-frame-analytics"
        onCloseFlyout={refresh}
        forceRefresh={isLoading}
      />
      <UpgradeWarning />

      {selectedTabId === 'map' && (mapJobId || mapModelId) && (
        <JobMap analyticsId={mapJobId} modelId={mapModelId} />
      )}
      {selectedTabId === 'data_frame_analytics' && (
        <DataFrameAnalyticsList
          blockRefresh={blockRefresh}
          pageState={dfaPageState}
          updatePageState={setDfaPageState}
        />
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
