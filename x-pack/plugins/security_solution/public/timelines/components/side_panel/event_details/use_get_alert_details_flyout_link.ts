/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { encode } from '@kbn/rison';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { inputsSelectors } from '../../../../common/store';
import { ALERTS_PATH } from '../../../../../common/constants';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';

export const useGetAlertDetailsFlyoutLink = ({ timestamp }: { timestamp?: string }) => {
  const { getAppUrl } = useAppUrl();
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const { search, pathname } = useLocation();
  const inputState = useSelector(getInputSelector);
  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const fromTime = timestamp ?? globalTimerange.from;

  // Add 1 millisecond to the alert timestamp as the alert table is non-inclusive of the end time
  // So we have to extend slightly beyond the range of the timestamp of the given alert
  const toTime = moment(timestamp ?? globalTimerange.to).add('1', 'millisecond');

  const alertDetailsLink = useMemo(() => {
    const searchDetails = new URLSearchParams(search);
    const flyoutString = searchDetails?.get(URL_PARAM_KEY.flyout) ?? '';
    const sourcererString = searchDetails?.get(URL_PARAM_KEY.sourcerer) ?? '';
    const timerange = encode({
      global: {
        [URL_PARAM_KEY.timerange]: {
          kind: 'absolute',
          from: fromTime,
          to: toTime,
        },
        linkTo: globalLinkTo,
      },
      timeline: {
        [URL_PARAM_KEY.timerange]: timelineTimerange,
        linkTo: timelineLinkTo,
      },
    });
    const url = getAppUrl({
      path: `${ALERTS_PATH}?${URL_PARAM_KEY.timerange}=${timerange}&${URL_PARAM_KEY.flyout}=${flyoutString}&${URL_PARAM_KEY.sourcerer}=${sourcererString}`,
    });
    return `${window.location.origin}${url}`;
  }, [fromTime, getAppUrl, globalLinkTo, search, timelineLinkTo, timelineTimerange, toTime]);

  const isOnAlertsPage = pathname === ALERTS_PATH;

  return { isOnAlertsPage, alertDetailsLink };
};
