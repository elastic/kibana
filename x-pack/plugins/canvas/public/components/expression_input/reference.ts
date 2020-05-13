/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentStrings } from '../../../i18n';
import {
  ExpressionFunction,
  ExpressionFunctionParameter,
} from '../../../../../../src/plugins/expressions';

const { ExpressionInput: strings } = ComponentStrings;

/**
 * Given an expression function, this function returns a markdown string
 * that includes the context the function accepts, what the function returns
 * as well as the general help/documentation text associated with the function
 */
export function getFunctionReferenceStr(fnDef: ExpressionFunction) {
  const { help, type, inputTypes } = fnDef;
  const acceptTypes = inputTypes ? inputTypes.join(' | ') : 'null';
  const returnType = type ? type : 'null';

  const doc = `${strings.getFunctionReferenceAcceptsDetail(
    acceptTypes
  )} ${strings.getFunctionReferenceReturnsDetail(returnType)}
\n\n${help}`;

  return doc;
}

/**
 * Given an argument definition, this function returns a markdown string
 * that includes the aliases of the argument, types accepted for the argument,
 * the default value of the argument, whether or not its required, and
 * the general help/documentation text associated with the argument
 */
export function getArgReferenceStr(argDef: Omit<ExpressionFunctionParameter, 'accepts'>) {
  const { aliases, types, default: def, required, help } = argDef;

  const secondLineArr = [];

  if (def != null) {
    secondLineArr.push(strings.getArgReferenceDefaultDetail(String(def)));
  }

  if (aliases && aliases.length) {
    secondLineArr.push(strings.getArgReferenceAliasesDetail(aliases.join(' | ')));
  }

  const typesStr = types && types.length ? types.join(' | ') : 'null';
  const requiredStr = String(Boolean(required));

  const ref = `${strings.getArgReferenceTypesDetail(
    typesStr
  )} ${strings.getArgReferenceRequiredDetail(requiredStr)}
  \n\n${secondLineArr.join(' ')}
  \n\n${help}`;

  return ref;
}
