/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');
const { JsonHighlightRules } = ace.acequire('ace/mode/json_highlight_rules');

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    console.log(JsonHighlightRules);
    this.$rules = {
      start: [
        {
          token: ['pipelinePlugin'],
          regex: /^(input|filter|output)/
        },
        {
          token: ['bracket'],
          regex: /(\{)/,
          next: 'segment'
        },
      ],
      segment: [
        {
          token: ['bracket'],
          regex: /(\})/,
          next: 'start'
        },
        {
          token: ['pluginName'],
          regex: /(mutate)/,
          next: 'pluginHeading'
        },
      ],
      pluginHeading: [
        {
          token: ['bracket'],
          regex: /(\{)/,
          next: 'pluginBody'
        }
      ],
      pluginBody: [
        {
          token: ['attribute'],
          regex: /[A-Za-z0-9_-]+/,
          next: 'attribute'
        },
        {
          token: ['bracket'],
          regex: /(\})/,
          next: 'segment'
        }
      ],
      attribute: [
        {
          token: ['operator'],
          regex: /=>/,
        },
        {
          token: ['boolean'],
          regex: /(true|false)/,
          next: 'pluginBody'
        }
      ],
      // test: [
      //   {
      //     token: ['pluginName'],
      //     regex: /(mutate)/
      //   },
      //   {
      //     token: ['bracket'],
      //     regex: /(\})/,
      //     next: 'start'
      //   }
      // ]
    };
    // this.embedRules(JsonHighlightRules, 'json-', [{
    //   token: 'end',
    //   regex: '^```$',
    //   next: 'start',
    // }]);
  }
}



