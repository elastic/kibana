/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';

export function ErrorStatePrompt() {
  return (
    <EuiEmptyPrompt
      title={
        <div>
          {i18n.translate('xpack.apm.error.prompt.title', {
            defaultMessage: `Sorry, an error occured :(`,
          })}
        </div>
      }
      body={i18n.translate('xpack.apm.error.prompt.body', {
        defaultMessage: `Please inspect your browser's developer console for details.`,
      })}
      titleSize="s"
    />
  );
}
