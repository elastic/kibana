/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Redirect, useLocation, useParams } from 'react-router-dom';

import moment from 'moment';
import { encode } from '@kbn/rison';
import { ALERTS_PATH } from '../../../../common/constants';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { inputsSelectors } from '../../../common/store';

export const AlertDetailsRedirect = () => {
  const { alertId } = useParams<{ alertId: string }>();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const timestamp = searchParams.get('timestamp');
  const index = searchParams.get('index');

  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);
  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const fromTime = timestamp ?? globalTimerange.from;

  // Add 1 millisecond to the alert timestamp as the alert table is non-inclusive of the end time
  // So we have to extend slightly beyond the range of the timestamp of the given alert
  const toTime = moment(timestamp ?? globalTimerange.to).add('1', 'millisecond');

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

  const flyoutString = encode({
    panelView: 'eventDetail',
    params: {
      eventId: alertId,
      indexName: index,
    },
  });

  const kqlAppQuery = encode({ language: 'kuery', query: `_id: ${alertId}` });

  const url = `${ALERTS_PATH}?${URL_PARAM_KEY.appQuery}=${kqlAppQuery}&${URL_PARAM_KEY.timerange}=${timerange}&${URL_PARAM_KEY.flyout}=${flyoutString}`;

  return <Redirect to={url} />;
};
