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

const relatedEventsLimitMessage = (
  <>
    <FormattedMessage
      id="xpack.securitySolution.endpoint.resolver.relatedEventLimitExceeded"
      defaultMessage="Some related events could not be displayed in this view."
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

export const RelatedEventLimitWarning = React.memo(function RelatedEventLimitWarning({
  className,
  relatedEventEntityId,
}: {
  className?: string;
  relatedEventEntityId: string;
}) {
  const relatedEventResponsesById = useSelector(selectors.relatedEventsByEntityId);
  const responseForThisNode = relatedEventResponsesById.get(relatedEventEntityId);
  if(!responseForThisNode || responseForThisNode.nextEvent === null){
    //return null;
  }
  return (
    <EuiCallOut color="warning" size="s" className={className} title={titleMessage}>
      <p>{relatedEventsLimitMessage}</p>
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
