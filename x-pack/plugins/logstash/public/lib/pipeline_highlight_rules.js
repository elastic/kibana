/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';
// import { isValidElement } from 'react';

// TODO: allow strings for attribute names

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

const openBraceRegex = /(\{)/;
const closeBraceRegex = /(\})/;

const performPop = (stack, value) => {
  while (stack[0] === value) {
    stack.shift();
  }
};

const pop = (popValues = [], pushValues = []) => {
  return (state, stack) => {
    console.log(state);
    console.log(stack);
    if (stack[0] !== state) {
      console.log('stack !== state');
    }
    performPop(stack, state);
    popValues.forEach(item => {
      performPop(stack, item);
    });
    pushValues.forEach(item => {
      stack.unshift(item);
    });
    console.log(stack);
    return stack[0]
      ? stack[0]
      : 'start';
  };
};

const popMatch = (value, stack) => {
  if (stack.length && stack[0] === value) {
    stack.shift();
  }
};

const popSingle = (popValues = [], pushValues = []) => {
  return (state, stack) => {
    console.log(state);
    console.log(stack);
    if (!popValues.length) {
      stack.shift();
    } else {
      popValues.forEach(value => {
        popMatch(value, stack);
      });
    }
    pushValues.forEach(value => {
      stack.unshift(value);
    });
    console.log(stack);
    return stack[0]
      ? stack[0]
      : 'start';
  };
};

const push = (pushState = [], nextState) => {
  return (state, stack) => {
    console.log(stack);
    if (typeof pushState === 'string') {
      stack.unshift(pushState);
    } else {
      pushState.forEach(value => {
        stack.unshift(value);
      });
    }
    console.log(stack);
    console.log(nextState);
    return nextState
      ? nextState
      : stack[0];
  };
};

function ValueRule(popStates = []) {
  return [
    new ArrayRule(pop(['array', ...popStates])),
    new HashRule(pop(['hash', ...popStates])),
    new NumberRule(pop(['number', ...popStates])),
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
        token: 'array',
        regex: /(\[)/,
        push: 'arrayEntry'
      },
      {
        token: 'operator',
        regex: /\,/
      },
      {
        token: 'quote',
        regex: /\'/,
        push: 'singleQuoteString'
      },
      {
        token: 'quote',
        regex: /\"/,
        push: 'doubleQuoteString'
      },
      {
        token: 'hash',
        regex: openBraceRegex,
        push: 'hashEntries'
      },
      new NumberRule(),
      new BarewordRule(),
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

function HashRule(next) {
  return {
    token: 'hash',
    regex: openBraceRegex,
    push: [
      {
        token: 'hash',
        regex: closeBraceRegex,
        next
      },
      {
        token: 'hashEntryName',
        regex: /([a-zA-Z0-9]+)/,
        next: 'hashOperator'
      },
      {
        token: 'array',
        regex: /(\[)/,
        push: 'arrayEntry'
      },
      ...getStringRules(pop([], ['hashOperator']))
    ]
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

const getCommentRule = () => ({
  token: 'ccc',
  regex: /(\#)/,
  push: 'ccc'
});

export class PipelineHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    this.$rules = {
      start: [
        getCommentRule(),
        {
          token: 'pipelineSection',
          regex: /(input|filter|output)/
        },
        {
          token: 'brace',
          regex: openBraceRegex,
          next: push('branchOrPlugin')
        },
      ],
      ccc: [
        {
          token: 'comment',
          regex: /$/,
          next: popSingle()
        },
        { defaultToken: 'ccc' }
      ],
      branchOrPlugin: [
        getCommentRule(),
        {
          token: 'brace',
          regex: closeBraceRegex,
          next: popSingle(['branchOrPlugin', 'branch'])
        },
        {
          token: 'control',
          regex: /(if|else ([\s]+)?if)/,
          next: push('branch')
        },
        {
          token: 'control',
          regex: /(else)/,
          next: push('else')
        },
        {
          token: 'plugin',
          regex: /[a-zA-Z0-9_-]+/,
          next: push('plugin')
        }
      ],
      else: [
        {
          token: 'brace',
          regex: openBraceRegex,
          next: popSingle(['else'], ['branch', 'branchOrPlugin'])
        },
      ],
      branch: [
        getCommentRule(),
        {
          token: 'operator',
          regex: /(\(|\)|in|not ([\s]+)?|and|or|xor|nand|==|!=|<=|>=|<|>|=~|\!~|\!)/
        },
        {
          token: 'brace',
          regex: openBraceRegex,
          next: push('branchOrPlugin')
        },
        {
          token: 'quote',
          regex: /\'/,
          next: push('sqs')
        },
        {
          token: 'quote',
          regex: /\"/,
          next: push('dqs')
        },
        {
          token: 'array',
          regex: /\[/,
          next: push('arrayEntry')
        },
        {
          token: 'bareword',
          regex: /[A-Za-z0-9]+/
        }
      ],
      // branch: [
      //   {
      //     token: 'operator',
      //     regex: /\(/,
      //     next: push('parenSection')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /!([\s]+)?\(/,
      //     next: push('negativeExpression')
      //   },
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: push('expression')
      //   }
      // ],
      // expression: [
      //   {
      //     token: 'brace',
      //     regex: openBraceRegex,
      //     next: (state, stack) => {
      //       if (stack[1] === 'branch') {
      //         return popSingle(['expression'], ['branchOrPlugin'])(state, stack);
      //       }
      //       return state;
      //     }
      //   },
      //   {
      //     token: 'operator',
      //     regex: /(and|or|xor|nand)/,
      //     next: push('expressionPredicate')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /in/,
      //     next: push('expressionPredicate')
      //   }
      // ],
      // expressionPredicate: [
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: popSingle()
      //   }
      // ],
      // parenSection: [
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: pop()
      //   }
      // ],
      // negativeExpression: [
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: pop()
      //   }
      // ],



      // condition: [
      //   {
      //     token: 'brace',
      //     regex: openBraceRegex,
      //     next: 'ifBody'
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\(/,
      //     next: push('parensCondition')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\!/,
      //     next: push('negativeExpressionOpen')
      //   },
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: push('exitableExpression')
      //   },
      // ],
      // parensCondition: [
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: popSingle()
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\!/,
      //     next: push('negativeExpressionOpen')
      //   },
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: push('containedExpression', 'containedExpression')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\(/,
      //     next: push('parensCondition', 'parensCondition')
      //   },
      // ],
      // containedExpression: [
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: popSingle(['containedExpression', 'parensCondition'])
      //   },
      //   {
      //     token: 'operator',
      //     regex: /in/,
      //     next: 'containedExpressionPredicate'
      //   },
      //   {
      //     token: 'operator',
      //     regex: /not ([\s]+)?in/,
      //     next: push('containedExpressionPredicate')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /(==|!=|<=|>=|<|>)/,
      //     next: push('containedComparePredicate')
      //   }
      // ],
      // containedComparePredicate: [
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: popSingle(['containedComparePredicate', 'containedExpression'])
      //   }
      // ],
      // containedExpressionPredicate: [
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: popSingle(['containedExpressionPredicate', 'containedExpression'])
      //   }
      // ],
      // exitableExpression: [
      //   {
      //     token: 'brace',
      //     regex: openBraceRegex,
      //     next: pop([], ['ifBody'])
      //   },
      //   {
      //     token: 'operator',
      //     regex: /in/,
      //     next: push('expressionPredicate')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /not ([\s]+)?in/,
      //     next: push('expressionPredicate')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /(==|!=|<=|>=|<|>)/,
      //     next: push('comparePredicate')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /(and|or|xor|nand)/,
      //     next: push('condition')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: pop(['negativeExpression', 'negativeExpressionOpen'])
      //   }
      // ],
      // comparePredicate: [
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: popSingle(['comparePredicate', 'exitableExpression'])
      //   }
      // ],
      // expressionPredicate: [
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: pop()
      //   }
      // ],
      // negativeExpressionOpen: [
      //   {
      //     token: 'operator',
      //     regex: /\(/,
      //     push: 'negativeExpression'
      //   }
      // ],
      // negativeExpression: [
      //   {
      //     token: 'operator',
      //     regex: /\)/,
      //     next: pop(['negativeExpression', 'negativeExpressionOpen'])
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\!/,
      //     next: push('negativeExpressionOpen')
      //   },
      //   {
      //     token: 'rvalue',
      //     regex: /rvalue/,
      //     next: push('exitableExpression')
      //   },
      //   {
      //     token: 'operator',
      //     regex: /\(/,
      //     next: push('parensCondition')
      //   },
      // ],
      plugin: [
        getCommentRule(),
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
        getCommentRule(),
        {
          token: 'operator',
          regex: /=>/,
          next: 'attributeValue'
        }
      ],
      attributeValue: [
        getCommentRule(),
        ...new ValueRule(['attributeValue', 'attributeOperator'])
      ],
      arrayEntry: [
        getCommentRule(),
        {
          token: 'array',
          regex: /(\])/,
          next: pop()
        },
        {
          token: 'array',
          regex: /(\[)/,
          push: 'arrayEntry'
        },
        {
          token: 'operator',
          regex: /\,/
        },
        {
          token: 'quote',
          regex: /\'/,
          push: 'singleQuoteString'
        },
        {
          token: 'quote',
          regex: /\"/,
          push: 'doubleQuoteString'
        },
        {
          token: 'hash',
          regex: openBraceRegex,
          push: 'hashEntries'
        },
        new NumberRule(),
        new BarewordRule(),
      ],
      arrayOperator: [
        getCommentRule(),
        {
          token: 'operator',
          regex: /\,/,
          next: pop()
        }
      ],
      arrayValue: [
        getCommentRule(),
        ...new ValueRule([], 'arrayOperator')
      ],
      hashEntries: [
        getCommentRule(),
        {
          token: 'hash',
          regex: closeBraceRegex,
          next: pop()
        },
        {
          token: 'hashEntryName',
          regex: /([a-zA-Z0-9]+)/,
          next: 'hashOperator'
        },
        ...getStringRules(pop([], ['hashOperator']))
      ],
      hashOperator: [
        getCommentRule(),
        {
          token: 'operator',
          regex: /=>/,
          next: 'hashValue'
        }
      ],
      hashValue: [
        getCommentRule(),
        ...new ValueRule(['hashValue', 'hashOperator', 'hashEntry'])
      ],
      sqs: [
        {
          token: 'quote',
          regex: /\'/,
          next: popSingle()
        },
        {
          token: 'escapeQuote',
          regex: singleQuoteEscapeRegex
        },
        {
          defaultToken: 'quote'
        }
      ],
      dqs: [
        {
          token: 'quote',
          regex: /\"/,
          next: popSingle()
        },
        {
          token: 'escapeQuote',
          regex: doubleQuoteEscapeRegex
        },
        {
          defaultToken: 'quote'
        }
      ],
      singleQuoteString: [
        {
          token: 'quote',
          regex: /\'/,
          next: 'pop'
        },
        {
          token: 'escapeQuote',
          regex: singleQuoteEscapeRegex
        },
        {
          defaultToken: 'quote'
        }
      ],
      doubleQuoteString: [
        {
          token: 'quote',
          regex: /\"/,
          next: 'pop'
        },
        {
          token: 'escapeQuote',
          regex: doubleQuoteEscapeRegex
        },
        {
          defaultToken: 'quote'
        }
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
