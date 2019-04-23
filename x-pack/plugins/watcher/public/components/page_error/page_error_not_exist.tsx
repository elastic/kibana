/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function PageErrorNotExist({ id }: { id: any }) {
  return (
    <EuiEmptyPrompt
      iconType="search"
      iconColor="primary"
      title={
        <h1>
          <FormattedMessage
            id="xpack.watcher.pageErrorNotExist.title"
            defaultMessage="Couldn't find watch"
          />
        </h1>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.watcher.pageErrorNotExist.description"
            defaultMessage="A watch with ID '{id}' could not be found."
            values={{ id }}
          />
        </p>
      }
    />
  );
}
