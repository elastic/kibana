/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import { FormattedMessage } from '@kbn/i18n/react';

export const NotFoundPage = pure(() => (
  <div>
    <FormattedMessage
      id="xpack.siem.pages.fourohfour.noContentFoundDescription"
      defaultMessage="No content found"
    />
  </div>
));
