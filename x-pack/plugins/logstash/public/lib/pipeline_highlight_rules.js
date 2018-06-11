/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';
// import { isValidElement } from 'react';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

const openBraceRegex = /(\{)/;
const closeBraceRegex = /(\})/;

const pop = (values) => {
  return (state, stack) => {
    console.log(state);
    console.log(stack);
    if (stack[0] === state) {
      stack.shift();
    }
    values.forEach(item => {
      while (stack[0] === item) {
        stack.shift();
      }
    });
    console.log(stack);
    return stack[0]
      ? stack[0]
      : 'start';
  };
};

function ValueRule(popStates) {
  return [
    new NumberRule(pop(['number', ...popStates])),
    new ArrayRule(pop(['array', ...popStates])),
    ...getStringRules(pop(['quote', ...popStates])),
    new BarewordRule(pop(['bareword', ...popStates]))
  ];
}

function ArrayRule(next) {
  return {
    token: 'array',
    regex: /(\[)/,
    push: [
      {
        token: 'array',
        regex: /(\])/,
        next
      },
      {
        token: 'operator',
        regex: /\,/
      },
      {
        defaultToken: 'hash'
      }
    ]
  };
}

function BarewordRule(next) {
  return {
    token: 'bareword',
    regex: /[A-Za-z0-9_]+/,
    next
  };
}

function getStringRules(next) {
  return [
    new SingleQuotedStringRule(next),
    new DoubleQuotedStringRule(next)
  ];
}

const singleQuoteRegex = /\'/;
const singleQuoteEscapeRegex = /\\\'/;
function SingleQuotedStringRule(next) {
  return {
    token: 'quote',
    regex: singleQuoteRegex,
    push: [
      {
        token: 'escapeQuote',
        regex: singleQuoteEscapeRegex
      },
      {
        token: 'quote',
        regex: singleQuoteRegex,
        next
      },
      {
        defaultToken: 'quote'
      }
    ]
  };
}

const doubleQuoteRegex = /\"/;
const doubleQuoteEscapeRegex = /\\\"/;
function DoubleQuotedStringRule(next) {
  return {
    token: 'quote',
    regex: doubleQuoteRegex,
    push: [
      {
        token: 'escapeQuote',
        regex: doubleQuoteEscapeRegex
      },
      {
        token: 'quote',
        regex: doubleQuoteRegex,
        next
      },
      {
        defaultToken: 'quote'
      }
    ]
  };
}

function NumberRule(next) {
  return {
    token: ['number'],
    regex: /[0-9]+(.[0-9]+)?/,
    next
  };
}

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    this.$rules = {
      start: [
        {
          token: 'pipelineSection',
          regex: /(input|filter|output)/,
          push: 'pipelineSection'
        }
      ],
      pipelineSection: [
        {
          token: 'brace',
          regex: openBraceRegex
        },
        {
          token: 'brace',
          regex: closeBraceRegex,
          next: 'pop'
        },
        { include: 'branchOrPlugin' },
        {
          defaultToken: 'pipelineSection'
        }
      ],
      ifHead: [
        {
          token: 'brace',
          regex: openBraceRegex,
          next: 'ifBody'
        },
        {
          defaultToken: 'condition'
        }
      ],
      ifBody: [
        {
          token: 'brace',
          regex: closeBraceRegex,
          next: pop(['ifBody', 'ifHead'])
        },
        {
          include: 'branchOrPlugin'
        },
        {
          defaultToken: 'rvalue'
        }
      ],
      branchOrPlugin: [
        {
          token: 'control',
          regex: /if/,
          push: 'ifHead'
        },
        {
          token: 'plugin',
          regex: /[a-zA-Z0-9_-]+/,
          push: 'plugin'
        }
      ],
      plugin: [
        {
          token: 'brace',
          regex: openBraceRegex
        },
        {
          token: 'attribute',
          regex: /[a-zA-Z0-9_-]+/,
          push: 'attributeOperator'
        },
        {
          token: 'brace',
          regex: closeBraceRegex,
          next: pop(['plugin'])
        }
      ],
      attributeOperator: [
        {
          token: 'operator',
          regex: /=>/,
          next: 'attributeValue'
        }
      ],
      attributeValue: [
        ...new ValueRule(['attributeValue', 'attributeOperator'])
        // {
        //   token: 'attribute',
        //   regex: /[a-zA-Z_-]+/,
        //   next: pop(['attributeValue', 'attributeOperator'])
        // }
        // {
        //   token: 'attribute',
        //   regex: /.*/,
        //   next: (state, stack) => pop(stack, ['attributeValue', 'attributeOperator'])
        // }
      ],
      // pluginSection: [
      //   {
      //     token: 'hash',
      //     regex: /(plugin)/,
      //     next: 'pluginHeading'
      //   },
      //   {
      //     token: 'ruby',
      //     regex: /(if)/,
      //     push: 'branchHeading'
      //   },
      //   {
      //     token: 'escapeQuote',
      //     regex: /(else)/,
      //     push: 'test'
      //   },
      //   {
      //     token: 'attribute',
      //     regex: /(\{)/,
      //     push: 'pluginSection'
      //   },
      //   {
      //     token: 'attribute',
      //     regex: /(\})/,
      //     next: 'pop'
      //   },
      //   {
      //     defaultToken: 'attribute'
      //   }
      // ],
      // test: [
      //   {
      //     token: 'escapeQuote',
      //     regex: /(\})/,
      //     next: 'pop'
      //   },
      //   {
      //     token: 'unrecognized',
      //     regex: /(\()/,
      //     push: 'condition'
      //   },
      //   {
      //     defaultToken: 'escapeQuote'
      //   }
      // ],
      // condition: [
      //   {
      //     token: 'unrecognized',
      //     regex: /(\))/,
      //     next: 'pop'
      //   },
      //   {
      //     defaultToken: 'unrecognized'
      //   }
      // ],
      // branchHeading: [
      //   {
      //     token: 'ruby',
      //     regex: /(\{)/,
      //     onMatch: (a, b, c) => { console.log('branch heading open'); console.log(c); return 'ruby';},
      //     next: 'branch'
      //   },
      // ],
      // branch: [
      //   {
      //     token: 'ruby',
      //     regex: /(if)/,
      //     next: 'branchHeading'
      //   },
      //   {
      //     token: 'ruby',
      //     regex: /(\})/,
      //     next: (a, b) => popHeading('branch', 'branchHeading', a, b)
      //   }
      // ],
      // pluginHeading: [
      //   {
      //     token: 'hash',
      //     regex: /(\{)/,
      //     push: 'plugin'
      //   },
      //   { defaultToken: 'plugin' }
      // ],
      // plugin: [
      //   {
      //     token: 'hash',
      //     regex: /(\})/,
      //     next: (state, stack) => popHeading('plugin', 'pluginHeading', state, stack)
      //   },
      //   {
      //     defaultToken: 'hash'
      //   },
      // ]
    };






    // start: [
    //   {
    //     token: 'attribute',
    //     regex: /(\[)/,
    //     push: 'text',
    //     onMatch: (a, b, c) => { console.log(a); console.log(b); console.log(c); return 'attribute'; }
    //   }
    // ],
    // text: [
    //   {
    //     token: 'attribute',
    //     regex: /(\])/,
    //     next: 'pop',
    //     onMatch: (a, b, c) => { console.log(a); console.log(b); console.log(c); return 'attribute'; }
    //   },
    //   {
    //     token: 'ruby',
    //     regex: /(\{)/,
    //     push: 'ruby',
    //     onMatch: (a, b, c) => { console.log(a); console.log(b); console.log(c); return 'ruby'; }
    //   },
    //   {
    //     defaultToken: 'attribute'
    //   }
    // ],
    // ruby: [
    //   {
    //     token: 'ruby',
    //     regex: /(\})/,
    //     next: 'pop',
    //     onMatch: (a, b, c) => { console.log(a); console.log(b); console.log(c); return 'ruby'; }
    //   },
    //   {
    //     token: 'attribute',
    //     regex: /(\[)/,
    //     push: 'text',
    //     onMatch: (a, b, c) => { console.log(a); console.log(b); console.log(c); return 'attribute'; }
    //   },
    //   {
    //     defaultToken: 'ruby'
    //   }
    // ]
    //};
    // this.$rules = {
    //   start: [
    //     {
    //       token: ['pipelineSection'],
    //       regex: /\b^(input|filter|output)\b/,
    //     },
    //     {
    //       token: ['brace'],
    //       regex: /(\{)/,
    //       onMatch: (a, b, c) => { console.log('pipeline section open'); console.log(b); console.log(c); return 'brace';},
    //       push: 'branchOrPlugin'
    //     },
    //     {
    //       defaultToken: 'error'
    //     }
    //   ],
    //   array,
    //   arrayValues,
    //   value: [
    //     { include: ['number', 'array', 'string', 'bareword'] }
    //   ],
    //   branchOrPlugin: [
    //     {
    //       token: 'branch',
    //       regex: /(\bif\b|else ([\s]+)?if)/,
    //       next: 'branch',
    //       onMatch: (a, b, c) => { console.log('branch name'); console.log(b); console.log(c); return 'branch';}
    //     },
    //     {
    //       token: 'brace',
    //       regex: /\}/,
    //       onMatch: (char, state, stack) => {
    //         console.log('close BOP');
    //         console.log(stack);
    //         if (stack.length > 1 && stack[0] === 'branchOrPlugin' && stack[1] === 'branch') {
    //           //stack.splice(0, 2);
    //         }
    //         // else if (stack.length) {
    //         //   console.log('shift');
    //         //   const shifted = stack.shift();
    //         //   console.log(shifted);
    //         //   console.log(stack);
    //         // }
    //         return 'brace';
    //       },
    //       next: (cur, stack) => {
    //         console.log('Im in the next');
    //         console.log(cur);
    //         console.log(stack);
    //         if (cur === 'branchOrPlugin' && !stack.length) {
    //           return 'start';
    //         }
    //         return 'branch';
    //       }
    //     },
    //     {
    //       include: 'bareword'
    //     }
    //   ],
    //   rvalue: [
    //     { include: [ 'string', 'number', 'array', 'regexp' ] }
    //   ],
    //   branch: [
    //     { include: 'condition' },
    //     {
    //       token: 'brace',
    //       regex: /\{/,
    //       onMatch: (a, b, c) => { console.log('---open BOP---'); console.log(a); console.log(b); console.log(c); return 'brace';},
    //       push: 'branchOrPlugin'
    //     },
    //     {
    //       token: 'brace',
    //       regex: /(\})/,
    //       onMatch: (a, b, c) => {
    //         //c.shift();
    //         console.log(a); console.log(b); console.log(c);
    //         return 'brace';
    //       }
    //     }
    //   ],
    //   condition: [
    //     { include: ['number', 'operator', 'rvalue', 'bareword'] }
    //   ],
    //   regexp: [
    //     {
    //       token: 'regexp',
    //       regex: /\/(.*)\//
    //     }
    //   ],
    //   // attribute: [
    //   //   // this could be any "value", make sure each of those states includes a pop
    //   //   {
    //   //     token: 'operator',
    //   //     regex: /([\s]+)?=>([\s]+)?/,
    //   //     push: 'attributeValue'
    //   //   },
    //   //   {
    //   //     token: 'operator',
    //   //     regex: /^$/,
    //   //     next: 'pop',
    //   //     onMatch: (a, b, c) => {console.log('matched'); return 'fubar';}
    //   //   },
    //   // ],
    //   // attributeValue: [
    //   //   {
    //   //     token: 'attributeValue',
    //   //     regex: /(end)/,
    //   //     next: 'pop'
    //   //   }
    //   //],
    //   // hash: [
    //   //   {
    //   //     token: 'name',
    //   //     regex: /[A-Za-z0-9_-]+/,
    //   //     push: 'hashEntry'
    //   //   },
    //   //   {
    //   //     token: 'brace',
    //   //     regex: /(\})/
    //   //   },
    //   // ],
    //   // hashEntry: [
    //   //   {

    //   //   }
    //   // ],
    //   string: [
    //     {
    //       token: 'quote',
    //       regex: /\"/,
    //       push: 'doubleQuotedString'
    //     },
    //     {
    //       token: 'quote',
    //       regex: /\'/,
    //       push: 'singleQuotedString'
    //     }
    //   ],
    //   doubleQuotedString: [
    //     {
    //       token: 'escapeQuote',
    //       regex: /\\\"/
    //     },
    //     {
    //       token: 'quote',
    //       regex: /\"/,
    //       next: 'pop'
    //     },
    //     {
    //       defaultToken: 'quote'
    //     }
    //   ],
    //   singleQuotedString: [
    //     {
    //       token: 'escapeQuote',
    //       regex: /\\\'/
    //     },
    //     {
    //       token: 'quote',
    //       regex: /\'/,
    //       next: 'pop'
    //     },
    //     {
    //       defaultToken: 'quote'
    //     }
    //   ],
    //   bareword: [
    //     {
    //       token: ['bareword'],
    //       regex: /[A-Za-z0-9_]+/,
    //       onMatch: (a, b, c) => { console.log('bareword'); console.log(b); console.log(c); return 'bareword';},
    //     }
    //   ],
    //   number: [
    //     {
    //       token: ['number'],
    //       regex: /[0-9]+(.[0-9]+)?/
    //     }
    //   ],
    //   operator: [
    //     {
    //       token: 'operator',
    //       regex: /(==|in|not|\!|\(|\))/
    //     }
    //   ],

    //   // branchOrPlugin: [
    //   //   {
    //   //     token: ['brace'],
    //   //     regex: /(\})/,
    //   //     next: 'start'
    //   //   },
    //   //   {
    //   //     token: ['branch'],
    //   //     regex: /(if|else(\s+)if)/,
    //   //     next: 'condition'
    //   //   },
    //   //   {
    //   //     token: ['pluginName'],
    //   //     regex: /(mutate)/,
    //   //     next: 'pluginHeading'
    //   //   },
    //   // ],
    //   // condition: [
    //   //   {
    //   //     token: ['operator'],
    //   //     regex: /:/,
    //   //     next: 'branchOrPlugin'
    //   //   }
    //   // ],
    //   // pluginHeading: [
    //   //   {
    //   //     token: ['brace'],
    //   //     regex: /(\{)/,
    //   //     next: 'pluginBody'
    //   //   }
    //   // ],
    //   // pluginBody: [
    //   //   {
    //   //     token: ['attribute'],
    //   //     regex: /[A-Za-z0-9_-]+/,
    //   //     next: 'attribute'
    //   //   },
    //   //   {
    //   //     token: ['brace'],
    //   //     regex: /(\})/,
    //   //     next: 'pluginSection'
    //   //   }
    //   // ],
    //   // attribute: [
    //   //   {
    //   //     token: ['operator'],
    //   //     regex: /=>/,
    //   //   },
    //   //   {
    //   //     token: ['boolean'],
    //   //     regex: /(true|false)/,
    //   //     next: 'pluginBody'
    //   //   },
    //   //   {
    //   //     token: ['brace'],
    //   //     regex: /(\{)/,
    //   //     next: 'hash'
    //   //   }
    //   // ],
    //   // hash: [
    //   //   {
    //   //     token: ['attribute'],
    //   //     regex: /[A-Za-z0-9_-]+/,
    //   //   },
    //   //   {
    //   //     token: ['operator'],
    //   //     regex: /(=>|:)/
    //   //   },
    //   //   {
    //   //     token: ['brace'],
    //   //     regex: /(\})/,
    //   //     next: 'pluginBody'
    //   //   }
    //   // ],
    // };
    // this.embedRules(JsonHighlightRules, 'json-', [{
    //   token: 'end',
    //   regex: '^```$',
    //   next: 'start',
    // }]);
    this.normalizeRules();
  }
}
