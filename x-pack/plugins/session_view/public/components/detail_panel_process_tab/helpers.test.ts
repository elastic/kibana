/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DASH } from '../../constants';
import { getProcessExecutableCopyText, formatProcessArgs, getIsInterativeString } from './helpers';

describe('detail panel process tab helpers tests', () => {
  it('getProcessExecutableCopyText works with empty array', () => {
    const result = getProcessExecutableCopyText([]);
    expect(result).toEqual('');
  });

  it('getProcessExecutableCopyText works with array of tuples', () => {
    const result = getProcessExecutableCopyText([
      ['echo', 'exec'],
      ['echo', 'exit'],
    ]);
    expect(result).toEqual('echo exec, echo exit');
  });

  it('getProcessExecutableCopyText returns empty string with an invalid array of tuples', () => {
    // when some sub arrays only have 1 item
    let result = getProcessExecutableCopyText([['echo', 'exec'], ['echo']]);
    expect(result).toEqual('');

    // when some sub arrays have more than two item
    result = getProcessExecutableCopyText([
      ['echo', 'exec'],
      ['echo', 'exec', 'random'],
      ['echo', 'exit'],
    ]);
    expect(result).toEqual('');
  });

  it("formatProcessArgs returns '-' when given empty args array", () => {
    const result = formatProcessArgs([]);
    expect(result).toEqual(DASH);
  });

  it('formatProcessArgs returns formatted args string', () => {
    let result = formatProcessArgs(['ls']);
    expect(result).toEqual("['ls']");

    // returns formatted string comma separating each arg
    result = formatProcessArgs(['ls', '--color=auto']);
    expect(result).toEqual("['ls', '--color=auto']");
  });

  it('getIsInterativeString works', () => {
    let result = getIsInterativeString(undefined);
    expect(result).toBe('False');

    result = getIsInterativeString({
      char_device: {
        major: 8,
        minor: 1,
      },
    });
    expect(result).toBe('True');
  });
});
