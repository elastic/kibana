/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { encode } from '@kbn/rison';
import copy from 'copy-to-clipboard';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppUrl } from '../../../../common/lib/kibana/hooks';
import { inputsSelectors } from '../../../../common/store';
import { ALERTS_PATH } from '../../../../../common/constants';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import { ALERT_COPY_TO_CLIPBOARD_SUCCESS } from './translations';

export const useGetAlertDetailsFlyoutLink = ({ timestamp }: { timestamp?: string }) => {
  const { getAppUrl } = useAppUrl();
  const { toasts: toastsService } = useKibana().notifications;
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const { search } = useLocation();
  const inputState = useSelector(getInputSelector);
  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const fromTime = timestamp ?? globalTimerange.from;
  const toTime = moment(timestamp ?? globalTimerange.to).add('1', 'millisecond');

  const copyAlertDetailsLink = useCallback(() => {
    const searchDetails = new URLSearchParams(search);
    const flyoutString = searchDetails?.get(URL_PARAM_KEY.flyout) ?? '';
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
      path: `${ALERTS_PATH}?${URL_PARAM_KEY.timerange}=${timerange}&${URL_PARAM_KEY.flyout}=${flyoutString}`,
    });
    copy(`${window.location.origin}${url}`);

    toastsService.success({
      title: ALERT_COPY_TO_CLIPBOARD_SUCCESS,
      toastLifeTimeMs: 1200,
    });
  }, [
    fromTime,
    getAppUrl,
    globalLinkTo,
    search,
    timelineLinkTo,
    timelineTimerange,
    toTime,
    toastsService,
  ]);

  const { pathname } = useLocation();
  const isOnAlertsPage = pathname === ALERTS_PATH;

  return { isOnAlertsPage, copyAlertDetailsLink };
};
