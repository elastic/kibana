/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { HeaderPage } from '../../../../common/components/header_page';
import { ALERT_DETAILS_TECHNICAL_PREVIEW } from '../translations';

interface AlertDetailsHeaderProps {
  loading: boolean;
  ruleName?: string;
  timestamp?: string;
}

export const AlertDetailsHeader = React.memo(
  ({ loading, ruleName, timestamp }: AlertDetailsHeaderProps) => {
    return (
      <HeaderPage
        badgeOptions={{ beta: true, text: ALERT_DETAILS_TECHNICAL_PREVIEW }}
        border
        isLoading={loading}
        subtitle={timestamp ? <PreferenceFormattedDate value={new Date(timestamp)} /> : ''}
        title={ruleName}
      />
    );
  }
);

AlertDetailsHeader.displayName = 'AlertDetailsHeader';
