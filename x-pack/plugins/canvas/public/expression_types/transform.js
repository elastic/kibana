/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { Registry } from '@kbn/interpreter/common';
import { FunctionForm } from './function_form';

export class Transform extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }
}

class TransformRegistry extends Registry {
  wrapper(obj) {
    return new Transform(obj);
  }
}

export const transformRegistry = new TransformRegistry();
