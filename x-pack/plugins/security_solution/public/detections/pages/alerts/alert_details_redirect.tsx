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
import { ALERTS_PATH, DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { inputsSelectors } from '../../../common/store';

export const AlertDetailsRedirect = () => {
  const { alertId } = useParams<{ alertId: string }>();
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const timestamp = searchParams.get('timestamp');
  // Although we use the 'default' space here when an index isn't provided or accidentally deleted
  // It's a safe catch all as we reset the '.internal.alerts-*` indices with the correct space in the flyout
  // Here: x-pack/plugins/security_solution/public/timelines/components/side_panel/event_details/helpers.tsx
  const index = searchParams.get('index') ?? `.internal${DEFAULT_ALERTS_INDEX}-default`;

  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);
  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  // Default to the existing global timerange if we don't get this query param for whatever reason
  const fromTime = timestamp ?? globalTimerange.from;
  // Add 5 minutes to the alert timestamp as the alert table is non-inclusive of the end time
  // This also provides padding time if the user clears the `_id` filter after redirect to see other alerts
  const toTime = moment(timestamp ?? globalTimerange.to).add('5', 'minutes');

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

  const url = `${ALERTS_PATH}?${URL_PARAM_KEY.appQuery}=${kqlAppQuery}&${URL_PARAM_KEY.timerange}=${timerange}&${URL_PARAM_KEY.eventFlyout}=${flyoutString}`;

  return <Redirect to={url} />;
};
