/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pick } from 'lodash';
import { Registry } from '@kbn/interpreter/common';
import { FunctionForm } from './function_form';

const NO_NEXT_EXP = 'no next expression';
const MISSING_MODEL_ARGS = 'missing model args';

function getModelArgs(expressionType) {
  if (!expressionType) {
    return NO_NEXT_EXP;
  }

  if (!expressionType.modelArgs) {
    return MISSING_MODEL_ARGS;
  }

  return expressionType.modelArgs.length > 0 ? expressionType.modelArgs : MISSING_MODEL_ARGS;
}

export class Model extends FunctionForm {
  constructor(props) {
    super(props);

    const propNames = ['requiresContext'];
    const defaultProps = {
      requiresContext: true,
    };

    Object.assign(this, defaultProps, pick(props, propNames));
  }

  resolveArg(dataArg, props) {
    // custom argument resolver
    // uses `modelArgs` from following expression to control which arguments get rendered
    const { nextExpressionType } = props;
    const modelArgs = getModelArgs(nextExpressionType);

    // if there is no following expression, or no modelArgs, argument is shown by default
    if (modelArgs === NO_NEXT_EXP || modelArgs === MISSING_MODEL_ARGS) {
      return { skipRender: false };
    }

    // if argument is missing from modelArgs, mark it as skipped
    const argName = get(dataArg, 'arg.name');
    const modelArg = modelArgs.find((modelArg) => {
      if (Array.isArray(modelArg)) {
        return modelArg[0] === argName;
      }
      return modelArg === argName;
    });

    return {
      label: Array.isArray(modelArg) ? get(modelArg[1], 'label') : null,
      skipRender: !modelArg,
    };
  }
}

class ModelRegistry extends Registry {
  wrapper(obj) {
    return new Model(obj);
  }
}

export const modelRegistry = new ModelRegistry();
