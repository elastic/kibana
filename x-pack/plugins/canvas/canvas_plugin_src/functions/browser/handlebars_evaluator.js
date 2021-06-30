/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*eslint new-cap: "off"*/

// Handlebars parser doesn't contain types for Visitor so keeping file as vanilla JS
const Handlebars = require('@handlebars/parser');
const _ = require('lodash');
const tinymath = require('@kbn/tinymath');

const isString = (val) => typeof val === 'string';
function pivotObjectArray(rows, columns) {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }
  const columnValues = _.map(columnNames, (name) => _.map(rows, name));
  return _.zipObject(columnNames, columnValues);
}

const knownHelpers = {
  with(context, options) {
    return options.fn(context);
  },
  if(conditional, options) {
    if (conditional) {
      return options.fn(this);
    }
  },
  unless(conditional, options) {
    if (!conditional) {
      return options.fn(this);
    }
  },
  each(items, options) {
    let result = '';
    for (let i = 0, j = items.length; i < j; i++) {
      result += options.fn(items[i]);
    }
    return result;
  },
  math(rows, expression, precision) {
    if (!Array.isArray(rows)) {
      return 'MATH ERROR: first argument must be an array';
    }
    const value = tinymath.evaluate(expression, pivotObjectArray(rows));
    try {
      return precision ? value.toFixed(precision) : value;
    } catch (e) {
      return value;
    }
  },
};

class HandlebarsEvaluator extends Handlebars.Visitor {
  ast;
  scopes = [];
  values = [];

  constructor(ast) {
    super();
    this.ast = ast;
  }

  render(context) {
    this.scopes = [context];
    this.values = [];
    this.accept(this.ast);
    return this.values.join('');
  }

  MustacheStatement(mustache) {
    this.SubExpression(mustache);
  }

  SubExpression(sexpr) {
    const name = sexpr.path.parts[0];
    const helper = knownHelpers[name];

    if (helper) {
      const [context] = this.scopes;
      const params = this.getParams(sexpr);
      const result = helper.apply(context, params);
      this.values.push(result);
      return;
    }

    super.SubExpression(sexpr);
  }

  BlockStatement(block) {
    const name = block.path.parts[0];
    const helper = knownHelpers[name];

    if (!helper) {
      throw new Error(`Unknown helper ${name}`);
    }

    const [context] = this.scopes;
    const params = this.getParams(block);
    const options = {
      fn: (nextContext) => {
        this.scopes.unshift(nextContext);
        this.acceptKey(block, 'program');
        this.scopes.shift();
      },
    };
    helper.call(context, ...params, options);
  }

  PathExpression(path) {
    const context = this.scopes[path.depth];
    const value = path.parts[0] === undefined ? context : _.get(context, path.parts);
    this.values.push(value);
  }

  ContentStatement(content) {
    this.values.push(content.value);
  }

  StringLiteral(string) {
    this.values.push(string.value);
  }

  NumberLiteral(number) {
    this.values.push(number.value);
  }

  BooleanLiteral(bool) {
    this.values.push(bool.value);
  }

  UndefinedLiteral() {
    this.values.push('undefined');
  }

  NullLiteral() {
    this.values.push('null');
  }

  getParams(block) {
    const currentValues = this.values;
    this.values = [];
    this.acceptArray(block.params);
    const params = this.values;
    this.values = currentValues;
    return params;
  }
}

module.exports.HandlebarsEvaluator = HandlebarsEvaluator;
