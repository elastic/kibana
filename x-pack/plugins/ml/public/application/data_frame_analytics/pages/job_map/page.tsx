/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState } from '../../../util/url_state';
import { NodeAvailableWarning } from '../../../components/node_available_warning';
import { SavedObjectsWarning } from '../../../components/saved_objects_warning';
import { UpgradeWarning } from '../../../components/upgrade';
import { JobMap } from '../job_map';
import { HelpMenu } from '../../../components/help_menu';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefreshAnalyticsList } from '../../common';
import { MlPageHeader } from '../../../components/page_header';
import { AnalyticsIdSelector } from '../components/analytics_selector';

export const Page: FC = () => {
  const [globalState] = useUrlState('_g');
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useRefreshAnalyticsList({ isLoading: setIsLoading });
  const mapJobId = globalState?.ml?.jobId;
  const mapModelId = globalState?.ml?.modelId;
  const [analyticsId, setAnalyticsId] = useState<{ model_id?: string; job_id?: string }>();
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;
  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsMap.title"
          defaultMessage="Map for Analytics"
        />
      </MlPageHeader>

      <NodeAvailableWarning />

      <SavedObjectsWarning
        jobType="data-frame-analytics"
        onCloseFlyout={refresh}
        forceRefresh={isLoading}
      />
      <UpgradeWarning />

      {mapJobId || mapModelId || analyticsId ? (
        <JobMap
          analyticsId={mapJobId || analyticsId?.job_id}
          modelId={mapModelId || analyticsId?.model_id}
        />
      ) : (
        <>
          <AnalyticsIdSelector setAnalyticsId={setAnalyticsId} />
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.dataframe.analyticsMap.noJobSelectedLabel"
                  defaultMessage="No Analytics ID selected"
                />
              </h2>
            }
            data-test-subj="mlNoAnalyticsFound"
          />
        </>
      )}
      <HelpMenu docLink={helpLink} />
    </>
  );
};
