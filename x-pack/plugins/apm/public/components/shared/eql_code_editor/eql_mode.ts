/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TextMode as TextModeInterface, acequire } from 'brace';
import { EQL_MODE_NAME } from './constants';
import { EQLHighlightRules } from './eql_highlight_rules';

type ITextMode = new () => TextModeInterface;

const TextMode = acequire('ace/mode/text').Mode as ITextMode;

export class EQLMode extends TextMode {
  HighlightRules: typeof EQLHighlightRules;
  $id: string;
  constructor() {
    super();
    this.$id = EQL_MODE_NAME;
    this.HighlightRules = EQLHighlightRules;
  }
}
