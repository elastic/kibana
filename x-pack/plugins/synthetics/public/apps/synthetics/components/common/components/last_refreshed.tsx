/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SHORT_TIMESPAN_LOCALE, SHORT_TS_LOCALE } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';

export function LastRefreshed() {
  const { lastRefresh: lastRefreshed } = useSyntheticsRefreshContext();
  const [refresh, setRefresh] = useState(() => Date.now());

  useEffect(() => {
    const interVal = setInterval(() => {
      setRefresh(Date.now());
    }, 5000);

    return () => {
      clearInterval(interVal);
    };
  }, []);

  useEffect(() => {
    setRefresh(Date.now());
  }, [lastRefreshed]);

  if (!lastRefreshed) {
    return null;
  }

  const isWarning = moment().diff(moment(lastRefreshed), 'minutes') > 5;
  const isDanger = moment().diff(moment(lastRefreshed), 'minutes') > 10;

  const prevLocal: string = moment.locale() ?? 'en';

  const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;
  if (!shortLocale) {
    moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
  }

  const updatedDate = moment(lastRefreshed).from(refresh);

  // Need to reset locale so it doesn't effect other parts of the app
  moment.locale(prevLocal);

  return (
    <EuiText
      color={isDanger ? 'danger' : isWarning ? 'warning' : 'subdued'}
      size="s"
      css={{ lineHeight: '40px', fontWeight: isWarning ? 'bold' : undefined }}
    >
      <FormattedMessage
        id="xpack.synthetics.lastUpdated.label"
        defaultMessage="Last refreshed: {updatedDate}"
        values={{
          updatedDate,
        }}
      />
    </EuiText>
  );
}
