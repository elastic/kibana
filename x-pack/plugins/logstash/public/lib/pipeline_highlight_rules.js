/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

const openBraceRegex = /(\{)/;
const closeBraceRegex = /(\})/;
const openArrayRegex = /\[/;
const hashValuePopRules = ['hashValue', 'hashOperator'];
const attributeValuePopRules = ['attributeValue', 'attributeOperator'];

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

const getNext = (popState, nextState) => (
  popState
    ? popSingle(popState, [nextState])
    : push(nextState)
);

const getArrayRule = (popState) => ({
  token: 'array',
  regex: openArrayRegex,
  next: getNext(popState, 'arrayEntry')
});

const getHashRule = (popState) => ({
  token: 'hash',
  regex: openBraceRegex,
  next: getNext(popState, 'hashEntries')
});

const getSqsRule = (popState) => ({
  token: 'quote',
  regex: /\'/,
  next: getNext(popState, 'sqs')
});

const getDqsRule = (popState) => ({
  token: 'quote',
  regex: /\"/,
  next: getNext(popState, 'dqs')
});

const getNumberRule = (popState) => (
  popState
    ? {
      token: ['number'],
      regex: /[0-9]+(.[0-9]+)?/,
      next: popSingle(popState),
    }
    : {
      token: ['number'],
      regex: /[0-9]+(.[0-9]+)?/,
    }
);

const getBarewordRule = (popState) => (
  popState
    ? {
      token: 'bareword',
      regex: /[A-Za-z0-9]+/,
      next: popSingle(popState),
    }
    : {
      token: 'bareword',
      regex: /[A-Za-z0-9]+/,
    }
);

const singleQuoteEscapeRegex = /\\\'/;
const doubleQuoteEscapeRegex = /\\\"/;

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
        getArrayRule(),
        getBarewordRule(),
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
          next: push('attributeOperator')
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
          next: push('attributeValue')
        }
      ],
      attributeValue: [
        getCommentRule(),
        getArrayRule(attributeValuePopRules),
        getHashRule(attributeValuePopRules),
        getSqsRule(attributeValuePopRules),
        getDqsRule(attributeValuePopRules),
        getNumberRule(attributeValuePopRules),
        getBarewordRule(attributeValuePopRules),
        //...new ValueRule(['attributeValue', 'attributeOperator'])
      ],
      arrayEntry: [
        getCommentRule(),
        {
          token: 'array',
          regex: /(\])/,
          next: popSingle()
        },
        getArrayRule(),
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
          next: push('hashEntries')
        },
        getNumberRule(),
        getBarewordRule(),
      ],
      arrayOperator: [
        getCommentRule(),
        {
          token: 'operator',
          regex: /\,/,
          next: pop()
        }
      ],
      hashEntries: [
        getCommentRule(),
        getArrayRule(),
        {
          token: 'hash',
          regex: closeBraceRegex,
          next: popSingle()
        },
        {
          token: 'hashEntryName',
          regex: /([a-zA-Z0-9]+)/,
          next: 'hashOperator'
        },
        {
          token: 'quote',
          regex: /\"/,
          next: push(['hashOperator', 'dqs'])
        },
        {
          token: 'quote',
          regex: /\'/,
          next: push(['hashOperator', 'sqs'])
        },
        //...getStringRules(popSingle([], ['hashOperator']))
      ],
      hashOperator: [
        getCommentRule(),
        {
          token: 'operator',
          regex: /=>/,
          next: push(['hashValue'])
        }
      ],
      hashValue: [
        getCommentRule(),
        getHashRule(hashValuePopRules),
        getArrayRule(hashValuePopRules),
        getNumberRule(hashValuePopRules),
        getBarewordRule(hashValuePopRules),
        getSqsRule(hashValuePopRules),
        getDqsRule(hashValuePopRules)
        // ...new ValueRule(['hashValue', 'hashOperator', 'hashEntry'])
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
