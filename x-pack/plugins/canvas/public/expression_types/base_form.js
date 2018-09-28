/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export class BaseForm {
  constructor(props) {
    if (!props.name) {
      throw new Error(
        (
          <FormattedMessage
            id="xpack.canvas.expression.types.requireNamePropertyErrorMessage"
            defaultMessage="Expression specs require a name property"
          />
        )
      );
    }

    this.name = props.name;
    this.displayName = props.displayName || this.name;
    this.help = props.help || '';
  }
}
