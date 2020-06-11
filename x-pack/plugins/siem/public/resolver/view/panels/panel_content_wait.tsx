/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { memo, useEffect, useMemo } from 'react';
import { EuiBreadcrumbs, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { ResolverEvent } from '../../../../common/endpoint/types';

/**
 * Display a waiting message to the user when we can't display what they requested because we don't have related event data yet.
 * If the related event data has not been requested yet (reflected by `relatedEventsState` being undefined) then issue a request.
 */
export const WaitForRelatedEvents = memo(function ({
  processEvent,
  relatedEventsState,
}: {
  processEvent: ResolverEvent;
  relatedEventsState: 'waitingForRelatedEventData' | undefined;
}) {
  const dispatch = useResolverDispatch();
  useEffect(() => {
    if (processEvent && relatedEventsState !== 'waitingForRelatedEventData') {
      // Don't request again if it's already waiting
      dispatch({
        type: 'userRequestedRelatedEventData',
        payload: processEvent,
      });
    }
  }, [dispatch, processEvent]);
  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.waiting.events', {
          defaultMessage: 'Events',
        }),
        onClick: () => {},
      },
    ];
  }, []);
  return (
    <>
      <EuiBreadcrumbs breadcrumbs={crumbs} />
      <EuiText textAlign="center">
        <div role="presentation">
          <EuiLoadingSpinner />
        </div>
        {i18n.translate('xpack.siem.endpoint.resolver.panel.waiting.waiting', {
          defaultMessage: 'Waiting For Related Events...',
        })}
      </EuiText>
    </>
  );
});
WaitForRelatedEvents.displayName = 'WaitForRelatedEvents';
