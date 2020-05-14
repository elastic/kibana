/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/common';
import { BaseForm } from './base_form';

export class ArgType extends BaseForm {
  constructor(props) {
    super(props);

    this.simpleTemplate = props.simpleTemplate;
    this.template = props.template;
    this.default = props.default;
    this.resolveArgValue = Boolean(props.resolveArgValue);
  }
}

class ArgTypeRegistry extends Registry {
  wrapper(obj) {
    return new ArgType(obj);
  }
}

export const argTypeRegistry = new ArgTypeRegistry();
