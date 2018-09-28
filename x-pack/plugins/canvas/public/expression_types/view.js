/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pick } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

export class View extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['help', 'modelArgs', 'requiresContext'];
    const defaultProps = {
      help: (
        <FormattedMessage
          id="xpack.canvas.expression.types.viewElementDescription"
          defaultMessage="Element: {elementName}"
          values={{ elementName: props.name }}
        />
      ),
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    this.modelArgs = this.modelArgs || [];

    if (!Array.isArray(this.modelArgs)) {
      throw new Error(
        (
          <FormattedMessage
            id="xpack.canvas.expression.types.viewElementMessageError"
            defaultMessage="{elementName} element is invalid, modelArgs must be an array"
            values={{ elementName: this.name }}
          />
        )
      );
    }
  }
}

class ViewRegistry extends Registry {
  wrapper(obj) {
    return new View(obj);
  }
}

export const viewRegistry = new ViewRegistry();
