/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { injectI18n } from '@kbn/i18n/react';
import { Registry } from '../../common/lib/registry';
import { FunctionForm } from './function_form';

class ViewUI extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['help', 'modelArgs', 'requiresContext'];
    const defaultProps = {
      help: this.props.intl.formatMessage(
        {
          id: 'xpack.canvas.expressionTypes.view.elementHelpText',
          defaultMessage: 'Element: {elementName}',
        },
        {
          elementName: props.name,
        }
      ),
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));

    this.modelArgs = this.modelArgs || [];

    if (!Array.isArray(this.modelArgs)) {
      throw new Error(
        this.props.intl.formatMessage(
          {
            id: 'xpack.canvas.expressionTypes.view.elementIsInvalidMessageError',
            defaultMessage: '{elementName} element is invalid, modelArgs must be an array',
          },
          {
            elementName: this.name,
          }
        )
      );
    }
  }
}

export const View = injectI18n(ViewUI);

class ViewRegistry extends Registry {
  wrapper(obj) {
    return new View(obj);
  }
}

export const viewRegistry = new ViewRegistry();
