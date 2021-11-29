/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function PageErrorNotExist({ id }: { id?: string }) {
  return (
    <EuiEmptyPrompt
      iconType="alert"
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
          {id ? (
            <FormattedMessage
              id="xpack.watcher.pageErrorNotExist.description"
              defaultMessage="A watch with ID '{id}' could not be found."
              values={{ id }}
            />
          ) : (
            <FormattedMessage
              id="xpack.watcher.pageErrorNotExist.noWatchIdDescription"
              defaultMessage="A watch could not be found."
            />
          )}
        </p>
      }
    />
  );
}
