/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt } from '@elastic/eui';

export function EmptyPrompt() {
  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.maps.inspector.vectorTile.noRequestsLoggedTitle"
            defaultMessage="No requests logged for vector tiles"
          />
        </h2>
      }
      body={
        <React.Fragment>
          <p>
            <FormattedMessage
              id="xpack.maps.inspector.vectorTile.noRequestsLoggedDescription.mapHasNotLoggedAnyRequestsText"
              defaultMessage="This map does not have any vector tile search results."
            />
          </p>
        </React.Fragment>
      }
    />
  );
}
