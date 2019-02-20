/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';
import { GrokHighlightRules } from './grok_highlight_rules';

const TextMode = ace.acequire('ace/mode/text').Mode;

export class GrokMode extends TextMode {
  constructor() {
    super();
    this.HighlightRules = GrokHighlightRules;
  }
}
