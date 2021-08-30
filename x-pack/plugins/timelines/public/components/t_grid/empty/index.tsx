/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const TGridEmpty: React.FC = () => {
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.timelines.tGrid.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      }
      titleSize="s"
      body={
        <p>
          <FormattedMessage
            id="xpack.timelines.tGrid.noResultsMatchSearchCriteriaDescription"
            defaultMessage="Try searching over a longer period of time or modifying your search."
          />
        </p>
      }
    />
  );
};
