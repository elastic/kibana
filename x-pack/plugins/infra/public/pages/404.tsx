/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React from 'react';

export class NotFoundPage extends React.PureComponent {
  public render() {
<<<<<<< HEAD
    return <div>No content found</div>;
=======
    return (
      <div>
        <FormattedMessage
          id="xpack.infra.notFoundPage.noContentFoundErrorTitle"
          defaultMessage="No content found"
        />
      </div>
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  }
}
