/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ParsedVars, replaceVarsWithParams } from './lightweight_param_formatter';
import variableParser from './variable_parser';

const params = {
  splice: 'value',
  reference: 'abc',
  nested: 'value',
  this: 'value',
  HOME: '/user/shahzad',
};

describe('LightweightParamFormatter', () => {
  it('should return null if no params are passed', () => {
    const expected: ParsedVars = [
      { content: 'test ', type: 'nonvar' },
      { content: { default: null, name: 'splice' }, type: 'var' },
      { content: ' this', type: 'nonvar' },
    ];
    const formatter = variableParser.parse('test ${splice} this');
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('test value this');
  });
  it('plain string', () => {
    const expected: ParsedVars = [{ content: 'string', type: 'nonvar' }];
    const formatter = variableParser.parse('string', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('string');
  });
  it('string containing :', () => {
    const expected: ParsedVars = [{ content: 'just:a:string', type: 'nonvar' }];
    const formatter = variableParser.parse('just:a:string', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('just:a:string');
  });
  it('string containing }', () => {
    const expected: ParsedVars = [{ content: 'abc } def', type: 'nonvar' }];
    const formatter = variableParser.parse('abc } def', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('abc } def');
  });
  it('string containing regex with $', () => {
    const expected: ParsedVars = [{ content: 'log$,|,l,e,g,$', type: 'nonvar' }];
    const formatter = variableParser.parse('log$|leg$', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('log$,|,l,e,g,$');
  });
  it('string with escaped var', () => {
    const expected: ParsedVars = [{ content: 'escaped $,${var}', type: 'nonvar' }];
    const formatter = variableParser.parse('escaped $${var}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('escaped $,${var}');
  });
  it('reference", "${reference}', () => {
    const expected: ParsedVars = [{ content: { default: null, name: 'reference' }, type: 'var' }];
    const formatter = variableParser.parse('${reference}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('abc');
  });
  it('exp in middle', () => {
    const expected: ParsedVars = [
      { content: 'test ', type: 'nonvar' },
      { content: { default: null, name: 'splice' }, type: 'var' },
      { content: ' this', type: 'nonvar' },
    ];
    const formatter = variableParser.parse('test ${splice} this', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('test value this');
  });
  it('exp at beginning', () => {
    const formatter = variableParser.parse('${splice} test', params);
    expect(formatter).toEqual([
      { content: { default: null, name: 'splice' }, type: 'var' },
      { content: ' test', type: 'nonvar' },
    ]);
  });
  it('exp at end', () => {
    const expected: ParsedVars = [
      { content: 'test ', type: 'nonvar' },
      { content: { default: null, name: 'this' }, type: 'var' },
    ];

    const formatter = variableParser.parse('test ${this}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('test value');
  });

  it.skip('exp with escaped $', () => {
    const expected: ParsedVars = [
      {
        content: '$,${',
        type: 'nonvar',
      },
      {
        content: {
          default: null,
          name: 'HOME',
        },
        type: 'var',
      },
      {
        content: '$,}',
        type: 'nonvar',
      },
    ];

    const formatter = variableParser.parse('$${${HOME}$}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('${/user/shahzad}');
  });
  // it('exp nested', () => {
  //   const expected: ParsedVars = [
  //     { content: { default: null, name: '${nested' }, type: 'var' },
  //     { content: '}', type: 'nonvar' },
  //   ];
  //
  //   const formatter = variableParser.parse('\\$\\{${nested}\\}', params);
  //   expect(formatter).toEqual(expected);
  //
  //   const result = replaceVarsWithParams(formatter, params);
  //   expect(result).toEqual('value');
  // });
  // it('exp nested in middle', () => {
  //   const formatter = variableParser.parse('${test.${this}.test}', params);
  //   expect(formatter).toEqual([
  //     { content: { default: null, name: 'test.${this' }, type: 'var' },
  //     { content: '.test}', type: 'nonvar' },
  //   ]);
  // });
  // it('exp nested at beginning', () => {
  //   const formatter = variableParser.parse('${${test}.this}', params);
  //   expect(formatter).toEqual([
  //     { content: { default: null, name: '${test' }, type: 'var' },
  //     { content: '.this}', type: 'nonvar' },
  //   ]);
  // });
  // it('exp nested at end', () => {
  //   const formatter = variableParser.parse('${test.${this}}', params);
  //   expect(formatter).toEqual([
  //     {
  //       content: {
  //         default: null,
  //         name: 'test.${this',
  //       },
  //       type: 'var',
  //     },
  //     {
  //       content: '}',
  //       type: 'nonvar',
  //     },
  //   ]);
  // });
  it('exp with default', () => {
    const expected: ParsedVars = [{ content: { default: 'default', name: 'test' }, type: 'var' }];

    const formatter = variableParser.parse('${test:default}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('default');
  });
  it('exp with default exp', () => {
    const formatter = variableParser.parse('${test:the ${default} value}', params);
    expect(formatter).toEqual([
      {
        content: {
          default: 'the ${default',
          name: 'test',
        },
        type: 'var',
      },
      {
        content: ' value}',
        type: 'nonvar',
      },
    ]);
  });
  it('exp with default containing }', () => {
    const formatter = variableParser.parse('${test:abc$}def}', params);
    expect(formatter).toEqual([
      { content: { default: 'abc$', name: 'test' }, type: 'var' },
      { content: 'def}', type: 'nonvar' },
    ]);
  });
  it.skip('exp with default containing } escaped', () => {
    const formatter = variableParser.parse('${test:abc$\\}def}', params);
    expect(formatter).toEqual([
      {
        content: {
          default: 'abc}def',
          name: 'test',
        },
        type: 'var',
      },
    ]);
  });
  it('exp with default containing :', () => {
    const expected: ParsedVars = [
      { content: { default: 'https://default:1234', name: 'test' }, type: 'var' },
    ];

    const formatter = variableParser.parse('${test:https://default:1234}', params);
    expect(formatter).toEqual(expected);

    const result = replaceVarsWithParams(formatter, params);
    expect(result).toEqual('https://default:1234');
  });
});
