/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { StickyContainer } from 'react-sticky';
import { connect, ConnectedProps } from 'react-redux';

import { useHistory } from 'react-router-dom';
import { SecurityPageName } from '../../../app/types';
import { TimelineId } from '../../../../common/types/timeline';
import { GlobalTime } from '../../../common/containers/global_time';
import {
  indicesExistOrDataTemporarilyUnavailable,
  WithSource,
} from '../../../common/containers/source';
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
import { useUserInfo } from '../../components/user_info';
import { DetectionEngineEmptyPage } from './detection_engine_empty_page';
import { DetectionEngineNoIndex } from './detection_engine_no_signal_index';
import { DetectionEngineHeaderPage } from '../../components/detection_engine_header_page';
import { DetectionEngineUserUnauthenticated } from './detection_engine_user_unauthenticated';
import * as i18n from './translations';
import { LinkButton } from '../../../common/components/links';
import { useFormatUrl } from '../../../common/components/link_to';

export const DetectionEnginePageComponent: React.FC<PropsFromRedux> = ({
  filters,
  query,
  setAbsoluteRangeDatePicker,
}) => {
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated: isUserAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    signalIndexName,
    hasIndexWrite,
  } = useUserInfo();
  const history = useHistory();
  const [lastAlerts] = useAlertInfo({});
  const { formatUrl } = useFormatUrl(SecurityPageName.alerts);

  const updateDateRangeCallback = useCallback<UpdateDateRange>(
    ({ x }) => {
      if (!x) {
        return;
      }
      const [min, max] = x;
      setAbsoluteRangeDatePicker({ id: 'global', from: min, to: max });
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

  const indexToAdd = useMemo(() => (signalIndexName == null ? [] : [signalIndexName]), [
    signalIndexName,
  ]);

  if (isUserAuthenticated != null && !isUserAuthenticated && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineUserUnauthenticated />
      </WrapperPage>
    );
  }
  if (isSignalIndexExists != null && !isSignalIndexExists && !loading) {
    return (
      <WrapperPage>
        <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
        <DetectionEngineNoIndex />
      </WrapperPage>
    );
  }

  return (
    <>
      {hasEncryptionKey != null && !hasEncryptionKey && <NoApiIntegrationKeyCallOut />}
      {hasIndexWrite != null && !hasIndexWrite && <NoWriteAlertsCallOut />}
      <WithSource sourceId="default" indexToAdd={indexToAdd}>
        {({ indicesExist, indexPattern }) => {
          return indicesExistOrDataTemporarilyUnavailable(indicesExist) ? (
            <StickyContainer>
              <FiltersGlobal>
                <SiemSearchBar id="global" indexPattern={indexPattern} />
              </FiltersGlobal>
              <WrapperPage>
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

                <GlobalTime>
                  {({ to, from, deleteQuery, setQuery }) => (
                    <>
                      <>
                        <AlertsHistogramPanel
                          deleteQuery={deleteQuery}
                          filters={filters}
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
                        <AlertsTable
                          timelineId={TimelineId.alertsPage}
                          loading={loading}
                          hasIndexWrite={hasIndexWrite ?? false}
                          canUserCRUD={(canUserCRUD ?? false) && (hasEncryptionKey ?? false)}
                          from={from}
                          signalsIndex={signalIndexName ?? ''}
                          to={to}
                        />
                      </>
                    </>
                  )}
                </GlobalTime>
              </WrapperPage>
            </StickyContainer>
          ) : (
            <WrapperPage>
              <DetectionEngineHeaderPage border title={i18n.PAGE_TITLE} />
              <DetectionEngineEmptyPage />
            </WrapperPage>
          );
        }}
      </WithSource>
      <SpyRoute pageName={SecurityPageName.alerts} />
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalInputs = inputsSelectors.globalSelector();
  return (state: State) => {
    const globalInputs: InputsRange = getGlobalInputs(state);
    const { query, filters } = globalInputs;

    return {
      query,
      filters,
    };
  };
};

const mapDispatchToProps = {
  setAbsoluteRangeDatePicker: dispatchSetAbsoluteRangeDatePicker,
};

const connector = connect(makeMapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const DetectionEnginePage = connector(React.memo(DetectionEnginePageComponent));
