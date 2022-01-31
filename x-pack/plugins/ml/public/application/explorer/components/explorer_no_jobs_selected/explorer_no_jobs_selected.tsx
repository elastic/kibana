/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering EuiEmptyPrompt when no jobs were found.
 */
import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const ExplorerNoJobsSelected: FC = () => {
  return (
    <EuiEmptyPrompt
      iconType="alert"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.explorer.noJobSelectedLabel"
            defaultMessage="No jobs selected"
          />
        </h2>
      }
      data-test-subj="mlNoJobsFound"
    />
  );
};
