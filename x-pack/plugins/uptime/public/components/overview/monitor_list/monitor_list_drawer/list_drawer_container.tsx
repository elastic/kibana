/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { AppState } from '../../../../state';
import { monitorDetailsSelector } from '../../../../state/selectors';
import { MonitorDetailsActionPayload } from '../../../../state/actions/types';
import { getMonitorDetailsAction } from '../../../../state/actions/monitor';
import { MonitorListDrawerComponent } from './monitor_list_drawer';
import { useGetUrlParams } from '../../../../hooks';
import { MonitorDetails, MonitorSummary } from '../../../../../common/runtime_types';

interface ContainerProps {
  summary: MonitorSummary;
  monitorDetails: MonitorDetails;
  loadMonitorDetails: typeof getMonitorDetailsAction;
}

const Container: React.FC<ContainerProps> = ({ summary, loadMonitorDetails, monitorDetails }) => {
  const monitorId = summary?.monitor_id;

  const { dateRangeStart: dateStart, dateRangeEnd: dateEnd } = useGetUrlParams();

  useEffect(() => {
    loadMonitorDetails({
      dateStart,
      dateEnd,
      monitorId,
    });
  }, [dateStart, dateEnd, monitorId, loadMonitorDetails]);
  return <MonitorListDrawerComponent monitorDetails={monitorDetails} summary={summary} />;
};

const mapStateToProps = (state: AppState, { summary }: any) => ({
  monitorDetails: monitorDetailsSelector(state, summary),
});

const mapDispatchToProps = (dispatch: any) => ({
  loadMonitorDetails: (actionPayload: MonitorDetailsActionPayload) =>
    dispatch(getMonitorDetailsAction(actionPayload)),
});

export const MonitorListDrawer = connect(mapStateToProps, mapDispatchToProps)(Container);
