/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FilterBadgeInvalidPlaceholder = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge iconType="unlink" color={euiTheme.colors.lightestShade}>
      <FormattedMessage
        id="unifiedSearch.filter.filterBadgeInvalidPlaceholder.label"
        defaultMessage="filter value is invalid or incomplete"
      />
    </EuiBadge>
  );
};
