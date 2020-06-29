/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';
import * as selectors from '../store/selectors';

const bothLimitsMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.bothLineageLimitsExceeded"
      defaultMessage="Some ancestors and children of the trigger event could not be displayed in this view."
    />
  </>
);

const childrenLimitMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.childrenLimitExceeded"
      defaultMessage="Some children of the trigger event could not be displayed in this view."
    />
  </>
);

const ancestorsLimitMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.ancestorsLimitExceeded"
      defaultMessage="Some ancestors of the trigger event could not be displayed in this view."
    />
  </>
);

const titleMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.lineageLimitsExceededTitle"
      defaultMessage="API Limit:"
    />
  </>
);

const RelatedEventsLimitMessage = React.memo(function RelatedEventsLimitMessage({
  category,
  numberOfEventsMissing,
}: {
  numberOfEventsMissing: number;
  category: string;
}) {
  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.endpoint.resolver.relatedEventLimitExceeded"
        defaultMessage="{numberOfEventsMissing} {category} events could not be displayed because the data limit has been reached."
        values={{ numberOfEventsMissing, category }}
      />
    </>
  );
});

const RelatedLimitTitleMessage = React.memo(function RelatedLimitTitleMessage({
  category,
  numberOfEventsDisplayed,
}: {
  numberOfEventsDisplayed: number;
  category: string;
}) {
  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.endpoint.resolver.relatedLimitsExceededTitle"
        defaultMessage="This list includes {numberOfEventsDisplayed} {category} events."
        values={{ numberOfEventsDisplayed, category }}
      />
    </>
  );
});

export const RelatedEventLimitWarning = React.memo(function RelatedEventLimitWarning({
  className,
  relatedEventEntityId,
  eventType,
  matchingEventEntries,
  aggregateCountForEventType,
}: {
  className?: string;
  relatedEventEntityId: string;
  eventType: string;
  matchingEventEntries: unknown[];
  aggregateCountForEventType: number;
}) {
  const relatedEventResponsesById = useSelector(selectors.relatedEventsByEntityId);
  const responseForThisNode = relatedEventResponsesById.get(relatedEventEntityId);
  if (!responseForThisNode || responseForThisNode.nextEvent === null) {
    return null;
  }

  /**
   * Based on API limits, all related events may not be displayed.
   */
  const numberActuallyDisplayed = matchingEventEntries.length;
  if (numberActuallyDisplayed >= aggregateCountForEventType) {
    // No need to show the limit warning for this category if we've got the number of events we expected,
    // even if the `nextEvent` cursor isn't null.
    return null;
  }
  const numberMissing = aggregateCountForEventType - numberActuallyDisplayed;
  return (
    <EuiCallOut
      size="s"
      className={className}
      title={
        <RelatedLimitTitleMessage
          category={eventType}
          numberOfEventsDisplayed={numberActuallyDisplayed}
        />
      }
    >
      <p>
        <RelatedEventsLimitMessage category={eventType} numberOfEventsMissing={numberMissing} />
      </p>
    </EuiCallOut>
  );
});

export const LineageLimitWarning = React.memo(function LineageLimitWarning({
  className,
}: {
  className?: string;
}) {
  const { children, ancestors } = useSelector(selectors.lineageLimitsReached);
  const limitMessage = useMemo(() => {
    if (children && ancestors) {
      return bothLimitsMessage;
    } else if (ancestors) {
      return ancestorsLimitMessage;
    }
    return childrenLimitMessage;
  }, [children, ancestors]);

  if (!children && !ancestors) {
    // If there are no limits exceeded, display nothing
    return null;
  }

  return (
    <EuiCallOut color="warning" size="s" className={className} title={titleMessage}>
      <p>{limitMessage}</p>
    </EuiCallOut>
  );
});
