/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';

const lineageLimitMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.eitherLineageLimitExceeded"
      defaultMessage="Some process events in the visualization and event list below could not be displayed because the data limit has been reached."
    />
  </>
);

const LineageTitleMessage = React.memo(function LineageTitleMessage({
  numberOfEntries,
}: {
  numberOfEntries: number;
}) {
  return (
    <>
      <FormattedMessage
        id="xpack.securitySolution.endpoint.resolver.relatedEventLimitTitle"
        defaultMessage="This list includes {numberOfEntries} process events."
        values={{ numberOfEntries }}
      />
    </>
  );
});

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

/**
 * Limit warning for hitting the /events API limit
 */
export const RelatedEventLimitWarning = React.memo(function RelatedEventLimitWarning({
  className,
  eventType,
  numberActuallyDisplayed,
  numberMissing,
}: {
  className?: string;
  eventType: string;
  numberActuallyDisplayed: number;
  numberMissing: number;
}) {
  /**
   * Based on API limits, all related events may not be displayed.
   */
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

/**
 * Limit warning for hitting a limit of nodes in the tree
 */
export const LimitWarning = React.memo(function LimitWarning({
  className,
  numberDisplayed,
}: {
  className?: string;
  numberDisplayed: number;
}) {
  return (
    <EuiCallOut
      size="s"
      className={className}
      title={<LineageTitleMessage numberOfEntries={numberDisplayed} />}
    >
      <p>{lineageLimitMessage}</p>
    </EuiCallOut>
  );
});
