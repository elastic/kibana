/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';

import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalTime } from '../../common/containers/use_global_time';

import { OverviewEmpty } from '../components/overview_empty';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';

export const UPDATING = i18n.translate('xpack.timelines.lastUpdated.updating', {
  defaultMessage: 'Updating...',
});

export const UPDATED = i18n.translate('xpack.timelines.lastUpdated.updated', {
  defaultMessage: 'Updated',
});

const DetectionResponseComponent = () => {
  const {
    indicesExist,
    indexPattern,
    selectedPatterns,
    loading: isSourcererLoading,
  } = useSourcererDataView();
  const { from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  const isLoading = useMemo(() => isSourcererLoading, [isSourcererLoading]);

  const { hasIndexRead, hasKibanaREAD } = useAlertsPrivileges();

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper>
            <HeaderPage title={'Detection & Response - SOC'}>
              <SiemSearchBar id="global" indexPattern={indexPattern} hideFilterBar hideQueryInput />
            </HeaderPage>
            {from}
            {to}
            <EuiFlexGroup>
              {isLoading ? (
                <EuiFlexItem grow={false}>{UPDATING}</EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <>{UPDATED} </>
                  <FormattedRelative
                    data-test-subj="last-updated-at-date"
                    key={`formatedRelative-${Date.now()}`}
                    value={new Date(updatedAt)}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    {hasIndexRead && hasKibanaREAD && <>{'alerts charts'}</>}
                  </EuiFlexItem>
                  <EuiFlexItem>{'cases chart'}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              <EuiFlexItem>{'rules table'}</EuiFlexItem>
              <EuiFlexItem>{'cases table'}</EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>{'hosts charts'}</EuiFlexItem>
                  <EuiFlexItem>{'users chart'}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <OverviewEmpty />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
