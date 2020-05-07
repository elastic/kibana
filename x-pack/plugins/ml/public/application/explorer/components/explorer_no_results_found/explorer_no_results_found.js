/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering EuiEmptyPrompt when no results were found.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiEmptyPrompt } from '@elastic/eui';

export const ExplorerNoResultsFound = () => (
  <EuiEmptyPrompt
    iconType="iInCircle"
    title={
      <h2>
        <FormattedMessage
          id="xpack.ml.explorer.noResultsFoundLabel"
          defaultMessage="No results found"
        />
      </h2>
    }
    body={
      <React.Fragment>
        <p>
          <FormattedMessage
            id="xpack.ml.explorer.tryWideningTimeSelectionLabel"
            defaultMessage="Try widening the time selection or moving further back in time"
          />
        </p>
      </React.Fragment>
    }
  />
);
