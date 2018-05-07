/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    this.$rules = {
      start: [
        {
          token: [
            'pipelinePlugin'
          ],
          regex: '^(input|filter|output|codec)'
        }
      ]
    };
  }
}
