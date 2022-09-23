/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { SecurityPageName } from '../../../../../common/constants';
import { HeaderPage } from '../../../../common/components/header_page';
import { BACK_TO_ALERTS_LINK } from '../translations';

interface AlertDetailsHeaderProps {
  loading: boolean;
  ruleName?: string;
  timestamp?: string;
}

export const AlertDetailsHeader = React.memo(
  ({ loading, ruleName, timestamp }: AlertDetailsHeaderProps) => {
    return (
      <HeaderPage
        backOptions={{
          pageId: SecurityPageName.alerts,
          text: BACK_TO_ALERTS_LINK,
          dataTestSubj: 'alert-details-back-to-alerts-link',
        }}
        badgeOptions={{ beta: true, text: 'Beta' }}
        border
        isLoading={loading}
        subtitle={timestamp ? <PreferenceFormattedDate value={new Date(timestamp)} /> : ''}
        title={ruleName}
      />
    );
  }
);

AlertDetailsHeader.displayName = 'AlertDetailsHeader';
