/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';

import { getEmptyTagValue } from '../../components/empty_value';

interface OwnProps {
  lastSeen: string | null;
  isLoading?: boolean;
}

export const LastBeatStat = pure<OwnProps>(({ lastSeen, isLoading = false }) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }
  return lastSeen !== null ? (
    <EuiToolTip position="bottom" content={lastSeen}>
      <FormattedMessage
        id="xpack.siem.headerPage.pageSubtitle"
        defaultMessage="Last Beat: {beat}"
        values={{
          beat: <FormattedRelative value={new Date(lastSeen)} />,
        }}
      />
    </EuiToolTip>
  ) : (
    getEmptyTagValue()
  );
});
