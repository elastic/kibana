/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

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

const getCommentRule = () => ({
  token: 'singleLineComment',
  regex: /(\#)/,
  next: push('singleLineComment')
});

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
      getCommentRule(),
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
      getCommentRule(),
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
      singleLineComment: [
        {
          token: 'comment',
          regex: /$/,
          next: popSingle()
        },
        { defaultToken: 'singleLineComment' }
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
    };

    this.normalizeRules();
  }
}
