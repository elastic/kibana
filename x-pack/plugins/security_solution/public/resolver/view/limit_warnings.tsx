/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LimitWarningsEuiCallOut } from './styles';

const lineageLimitMessage = (
  <FormattedMessage
    id="xpack.securitySolution.endpoint.resolver.eitherLineageLimitExceeded"
    defaultMessage="Some process events in the visualization and event list below could not be displayed because the data limit has been reached."
  />
);

const LineageTitleMessage = React.memo(function ({ numberOfEntries }: { numberOfEntries: number }) {
  return (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.relatedEventLimitTitle"
      defaultMessage="This list includes {numberOfEntries} process events."
      values={{ numberOfEntries }}
    />
  );
});

const RelatedEventsLimitMessage = React.memo(function ({
  category,
  numberOfEventsMissing,
}: {
  numberOfEventsMissing: number;
  category: string;
}) {
  return (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.relatedEventLimitExceeded"
      defaultMessage="{numberOfEventsMissing} {category} events could not be displayed because the data limit has been reached."
      values={{ numberOfEventsMissing, category }}
    />
  );
});

const RelatedLimitTitleMessage = React.memo(function ({
  category,
  numberOfEventsDisplayed,
}: {
  numberOfEventsDisplayed: number;
  category: string;
}) {
  return (
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.relatedLimitsExceededTitle"
      defaultMessage="This list includes {numberOfEventsDisplayed} {category} events."
      values={{ numberOfEventsDisplayed, category }}
    />
  );
});

/**
 * Limit warning for hitting the /events API limit
 */
export const RelatedEventLimitWarning = React.memo(function ({
  eventCategory,
  numberActuallyDisplayed,
  numberMissing,
}: {
  eventCategory: string;
  numberActuallyDisplayed: number;
  numberMissing: number;
}) {
  /**
   * Based on API limits, all related events may not be displayed.
   */
  return (
    <LimitWarningsEuiCallOut
      size="s"
      title={
        <RelatedLimitTitleMessage
          category={eventCategory}
          numberOfEventsDisplayed={numberActuallyDisplayed}
        />
      }
    >
      <p>
        <RelatedEventsLimitMessage category={eventCategory} numberOfEventsMissing={numberMissing} />
      </p>
    </LimitWarningsEuiCallOut>
  );
});

/**
 * Limit warning for hitting a limit of nodes in the tree
 */
export const LimitWarning = React.memo(function ({ numberDisplayed }: { numberDisplayed: number }) {
  return (
    <LimitWarningsEuiCallOut
      size="s"
      title={<LineageTitleMessage numberOfEntries={numberDisplayed} />}
    >
      <p>{lineageLimitMessage}</p>
    </LimitWarningsEuiCallOut>
  );
});
