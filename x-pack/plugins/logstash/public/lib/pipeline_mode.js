/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';
import { PipelineHighlightRules } from './pipeline_highlight_rules';

const TextMode = ace.acequire('ace/mode/text').Mode;

export class PipelineMode extends TextMode {
  constructor() {
    super();
    this.HighlightRules = PipelineHighlightRules;
  }
}
