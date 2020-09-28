/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiWindowEvent } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo, useState } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { SecurityPageName } from '../../../app/types';
import { TimelineId } from '../../../../common/types/timeline';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { FiltersGlobal } from '../../../common/components/filters_global';
import { getRulesUrl } from '../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../common/components/search_bar';
import { WrapperPage } from '../../../common/components/wrapper_page';
import { State } from '../../../common/store';
import { inputsSelectors } from '../../../common/store/inputs';
import { setAbsoluteRangeDatePicker as dispatchSetAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { InputsRange } from '../../../common/store/inputs/model';
import { useAlertInfo } from '../../components/alerts_info';
import { AlertsTable } from '../../components/alerts_table';
import { NoApiIntegrationKeyCallOut } from '../../components/no_api_integration_callout';
import { NoWriteAlertsCallOut } from '../../components/no_write_alerts_callout';
import { AlertsHistogramPanel } from '../../components/alerts_histogram_panel';
import { alertsHistogramOptions } from '../../components/alerts_histogram_panel/config';
import { useUserData } from '../../components/user_info';
import { OverviewEmpty } from '../../../overview/components/overview_empty';
import { DetectionEngineNoIndex } from './detection_engine_no_index';
import { DetectionEngineHeaderPage } from '../../components/detection_engine_header_page';
import { useListsConfig } from '../../containers/detection_engine/lists/use_lists_config';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { LinkButton } from '../../../common/components/links';
import { useFormatUrl } from '../../../common/components/link_to';
import { useFullScreen } from '../../../common/containers/use_full_screen';
import { Display } from '../../../hosts/pages/display';
import { showGlobalFilters } from '../../../timelines/components/timeline/helpers';
import { timelineSelectors } from '../../../timelines/store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { buildShowBuildingBlockFilter } from '../../components/alerts_table/default_config';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

export const DetectionEnginePageComponent: React.FC<PropsFromRedux> = ({
  filters,
  graphEventId,
  query,
  setAbsoluteRangeDatePicker,
}) => {
  const { to, from, deleteQuery, setQuery } = useGlobalTime();
  const { globalFullScreen } = useFullScreen();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated: isUserAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
      signalIndexName,
      hasIndexWrite,
    },
  ] = useUserData();
  const {
    loading: listsConfigLoading,
    needsConfiguration: needsListsConfiguration,
  } = useListsConfig();
  const history = useHistory();
  const [lastAlerts] = useAlertInfo({});
  const { formatUrl } = useFormatUrl(SecurityPageName.detections);
  const [showBuildingBlockAlerts, setShowBuildingBlockAlerts] = useState(false);
  const loading = userInfoLoading || listsConfigLoading;

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      setAbsoluteRangeDatePicker({
        id: 'global',
        from: new Date(min).toISOString(),
        to: new Date(max).toISOString(),
      });
    },
    [setAbsoluteRangeDatePicker]
  );

  const goToRules = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getRulesUrl());
    },
    [history]
  );

  const alertsHistogramDefaultFilters = useMemo(
    () => [...filters, ...buildShowBuildingBlockFilter(showBuildingBlockAlerts)],
    [filters, showBuildingBlockAlerts]
  );

  // AlertsTable manages global filters itself, so not including `filters`
  const alertsTableDefaultFilters = useMemo(
    () => buildShowBuildingBlockFilter(showBuildingBlockAlerts),
    [showBuildingBlockAlerts]
  );

  const onShowBuildingBlockAlertsChangedCallback = useCallback(
    (newShowBuildingBlockAlerts: boolean) => {
      setShowBuildingBlockAlerts(newShowBuildingBlockAlerts);
    },
    [setShowBuildingBlockAlerts]
  );

  const { indicesExist, indexPattern } = useSourcererScope(SourcererScopeName.detections);

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </WrapperPage>
    );
  }

  if (!loading && (isSignalIndexExists === false || needsListsConfiguration)) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex
          needsSignalsIndex={isSignalIndexExists === false}
          needsListsIndex={needsListsConfiguration}
        />
      </WrapperPage>
    );
  }

  return (
    <>
      {hasEncryptionKey != null && !hasEncryptionKey && <NoApiIntegrationKeyCallOut />}
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteAlertsCallOut />}
      {indicesExist ? (
        <>
          <EuiWindowEvent event="resize" handler={noop} />
          <FiltersGlobal show={showGlobalFilters({ globalFullScreen, graphEventId })}>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>

          <WrapperPage noPadding={globalFullScreen}>
            <Display show={!globalFullScreen}>
              <DetectionEngineHeaderPage
                subtitle={
                  lastAlerts != null && (
                    <>
                      {i18n.LAST_ALERT}
                      {': '}
                      {lastAlerts}
                    </>
                  )
                }
                title={i18n.PAGE_TITLE}
              >
                <LinkButton
                  fill
                  onClick={goToRules}
                  href={formatUrl(getRulesUrl())}
                  iconType="gear"
                  data-test-subj="manage-alert-detection-rules"
                >
                  {i18n.BUTTON_MANAGE_RULES}
                </LinkButton>
              </DetectionEngineHeaderPage>
              <AlertsHistogramPanel
                deleteQuery={deleteQuery}
                filters={alertsHistogramDefaultFilters}
                from={from}
                query={query}
                setQuery={setQuery}
                showTotalAlertsCount={true}
                signalIndexName={signalIndexName}
                stackByOptions={alertsHistogramOptions}
                to={to}
                updateDateRange={updateDateRangeCallback}
              />
              <EuiSpacer size="l" />
            </Display>

            <AlertsTable
              timelineId={TimelineId.detectionsPage}
              loading={loading}
              hasIndexWrite={hasIndexWrite ?? false}
              canUserCRUD={(canUserCRUD ?? false) && (hasEncryptionKey ?? false)}
              from={from}
              defaultFilters={alertsTableDefaultFilters}
              showBuildingBlockAlerts={showBuildingBlockAlerts}
              onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChangedCallback}
              to={to}
            />
          </WrapperPage>
        </>
      ) : (
        <WrapperPage>
          <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
          <OverviewEmpty />
        </WrapperPage>
      )}
      <SpyRoute pageName={SecurityPageName.detections} />
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    const timeline: TimelineModel =
      getTimeline(state, TimelineId.detectionsPage) ?? timelineDefaults;
    const { graphEventId } = timeline;

    return {
      query,
      filters,
      graphEventId,
    };
  };
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));
