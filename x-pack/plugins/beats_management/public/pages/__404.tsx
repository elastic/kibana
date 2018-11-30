/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export class NotFoundPage extends React.PureComponent {
  public render() {
    return (
      <div>
        <FormattedMessage
          id="xpack.beatsManagement.noContentFoundErrorMessage"
          defaultMessage="No content found"
        />
      </div>
    );
  }
}
