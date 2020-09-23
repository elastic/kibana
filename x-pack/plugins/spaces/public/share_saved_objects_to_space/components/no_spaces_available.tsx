/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const NoSpacesAvailable = () => {
  return (
    <EuiEmptyPrompt
      body={
        <p>
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.noSpacesBody"
            defaultMessage="There are no eligible spaces to share into."
          />
        </p>
      }
      title={
        <h3>
          <FormattedMessage
            id="xpack.spaces.management.shareToSpace.noSpacesTitle"
            defaultMessage="No spaces available"
          />
        </h3>
      }
    />
  );
};
