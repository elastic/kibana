/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import moment from 'moment';
import { encode } from '@kbn/rison';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { ALERTS_PATH, DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { inputsSelectors } from '../../../common/store';

export const AlertDetailsRedirect = ({
  match: {
    params: { alertId, timestamp },
  },
}) => {
  // TODO: spaceId isn't set when this redirect is initialized. We may have to store it in the url as well
  // TODO: Updatee timestamp & space as query params rather than path params
  const spaceId = useSpaceId();
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
      indexName: `${DEFAULT_ALERTS_INDEX}-${spaceId ?? 'default'}`,
    },
  });

  // TODO: Does a builder for this already exist somewhere?
  const queryString = encode({
    language: 'kuery',
    query: `_id: ${alertId}`,
  });

  const url = `${ALERTS_PATH}?${URL_PARAM_KEY.appQuery}=${queryString}&${URL_PARAM_KEY.timerange}=${timerange}&${URL_PARAM_KEY.flyout}=${flyoutString}`;

  return <Redirect to={url} />;
};
