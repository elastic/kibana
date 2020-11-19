/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { PureComponent } from 'react';

export class TransformErrorSection extends PureComponent<{}, {}> {
  public render() {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.editRole.transformErrorSectionTitle"
              defaultMessage="Malformed role"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.transformErrorSectionDescription"
              defaultMessage="This role definition is invalid, and cannot be edited through this screen."
            />
          </p>
        }
      />
    );
  }
}
