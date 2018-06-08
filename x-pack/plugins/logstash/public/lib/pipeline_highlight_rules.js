/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');
const { JsonHighlightRules } = ace.acequire('ace/mode/json_highlight_rules');

// function rword(parentRule) {
//   const items = [
//     bareword,
//     number
//   ];
//   return items.map(item => Object.assign(item, { next: parentRule }));
// }

const array = [
  {
    token: 'brace',
    regex: /\[/,
    push: 'arrayValues'
  }
];

const arrayValues = [
  {
    include: 'value'
  },
  {
    token: 'operator',
    regex: /\,/
  },
  {
    token: 'brace',
    regex: /\]/,
    next: 'pop'
  }
];

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    console.log(JsonHighlightRules);
    this.$rules = {
      start: [
        {
          token: ['pipelineSection'],
          regex: /\b^(input|filter|output)\b/,
        },
        {
          token: ['brace'],
          regex: /(\{)/,
          push: 'branchOrPlugin'
        },
        {
          token: 'whitespace',
          regex: /\s+/
        },
        {
          defaultToken: 'error'
        }
      ],
      array,
      arrayValues,
      value: [
        { include: ['number', 'array', 'string', 'bareword'] }
      ],
      branchOrPlugin: [
        {
          token: 'branch',
          regex: /(\bif\b|else ([\s]+)?if)/,
          next: 'branch'
        },
        {
          token: 'brace',
          regex: /\}/,
          next: 'pop'
        }
      ],
      rvalue: [
        { include: [ 'string', 'number', 'array', 'regexp' ] }
      ],
      branch: [
        { include: 'condition' },
        {
          token: 'brace',
          regex: /\{/,
          push: 'branchOrPlugin'
        },
        {
          token: 'brace',
          regex: /(\})/,
          next: 'pop'
        }
      ],
      condition: [
        { include: ['number', 'operator', 'rvalue', 'bareword'] }
      ],
      regexp: [
        {
          token: 'regexp',
          regex: /\/(.*)\//
        }
      ],
      // attribute: [
      //   // this could be any "value", make sure each of those states includes a pop
      //   {
      //     token: 'operator',
      //     regex: /([\s]+)?=>([\s]+)?/,
      //     push: 'attributeValue'
      //   },
      //   {
      //     token: 'operator',
      //     regex: /^$/,
      //     next: 'pop',
      //     onMatch: (a, b, c) => {console.log('matched'); return 'fubar';}
      //   },
      // ],
      // attributeValue: [
      //   {
      //     token: 'attributeValue',
      //     regex: /(end)/,
      //     next: 'pop'
      //   }
      //],
      // hash: [
      //   {
      //     token: 'name',
      //     regex: /[A-Za-z0-9_-]+/,
      //     push: 'hashEntry'
      //   },
      //   {
      //     token: 'brace',
      //     regex: /(\})/
      //   },
      // ],
      // hashEntry: [
      //   {

      //   }
      // ],
      string: [
        {
          token: 'quote',
          regex: /\"/,
          push: 'doubleQuotedString'
        },
        {
          token: 'quote',
          regex: /\'/,
          push: 'singleQuotedString'
        }
      ],
      doubleQuotedString: [
        {
          token: 'escapeQuote',
          regex: /\\\"/
        },
        {
          token: 'quote',
          regex: /\"/,
          next: 'pop'
        },
        {
          defaultToken: 'quote'
        }
      ],
      singleQuotedString: [
        {
          token: 'escapeQuote',
          regex: /\\\'/
        },
        {
          token: 'quote',
          regex: /\'/,
          next: 'pop'
        },
        {
          defaultToken: 'quote'
        }
      ],
      bareword: [
        {
          token: ['bareword'],
          regex: /[A-Za-z0-9_]+/
        }
      ],
      number: [
        {
          token: ['number'],
          regex: /[0-9]+(.[0-9]+)?/
        }
      ],
      operator: [
        {
          token: 'operator',
          regex: /(==|in|not|\!|\(|\))/
        }
      ],

      // branchOrPlugin: [
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'start'
      //   },
      //   {
      //     token: ['branch'],
      //     regex: /(if|else(\s+)if)/,
      //     next: 'condition'
      //   },
      //   {
      //     token: ['pluginName'],
      //     regex: /(mutate)/,
      //     next: 'pluginHeading'
      //   },
      // ],
      // condition: [
      //   {
      //     token: ['operator'],
      //     regex: /:/,
      //     next: 'branchOrPlugin'
      //   }
      // ],
      // pluginHeading: [
      //   {
      //     token: ['brace'],
      //     regex: /(\{)/,
      //     next: 'pluginBody'
      //   }
      // ],
      // pluginBody: [
      //   {
      //     token: ['attribute'],
      //     regex: /[A-Za-z0-9_-]+/,
      //     next: 'attribute'
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'pluginSection'
      //   }
      // ],
      // attribute: [
      //   {
      //     token: ['operator'],
      //     regex: /=>/,
      //   },
      //   {
      //     token: ['boolean'],
      //     regex: /(true|false)/,
      //     next: 'pluginBody'
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\{)/,
      //     next: 'hash'
      //   }
      // ],
      // hash: [
      //   {
      //     token: ['attribute'],
      //     regex: /[A-Za-z0-9_-]+/,
      //   },
      //   {
      //     token: ['operator'],
      //     regex: /(=>|:)/
      //   },
      //   {
      //     token: ['brace'],
      //     regex: /(\})/,
      //     next: 'pluginBody'
      //   }
      // ],
    };
    // this.embedRules(JsonHighlightRules, 'json-', [{
    //   token: 'end',
    //   regex: '^```$',
    //   next: 'start',
    // }]);
    this.normalizeRules();
  }
}
