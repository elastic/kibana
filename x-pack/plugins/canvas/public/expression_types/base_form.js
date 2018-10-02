/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { injectI18n } from '@kbn/i18n/react';

class BaseFormUI {
  constructor(props) {
    if (!props.name) {
      throw new Error(
        this.props.intl.formatMessage({
          id: 'xpack.canvas.expressionTypes.namePropertyRequiredErrorMessage',
          defaultMessage: 'Expression specs require a name property',
        })
      );
    }

    this.name = props.name;
    this.displayName = props.displayName || this.name;
    this.help = props.help || '';
  }
}
export const BaseForm = injectI18n(BaseFormUI);
