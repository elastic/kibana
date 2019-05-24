/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AvailableFunctions,
  Function,
  ArgumentType,
} from '../../canvas_plugin_src/functions/types';

export interface AutocompleteFunctionSuggestion {
  type: 'function';
  text: string;
  start: number;
  end: number;
  fnDef: AvailableFunctions;
}

export interface AutocompleteArgNameSuggestion {
  type: 'arg';
  text: string;
  start: number;
  end: number;
  argDef: ArgumentType<any>;
}

export interface AutocompleteArgValueSuggestion {
  type: 'value';
  text: string;
  start: number;
  end: number;
}

export type AutocompleteSuggestion =
  | AutocompleteArgNameSuggestion
  | AutocompleteArgValueSuggestion
  | AutocompleteFunctionSuggestion;

export function getAutocompleteSuggestions(
  specs: AvailableFunctions[],
  expression: string,
  position: number
): AutocompleteSuggestion[];
