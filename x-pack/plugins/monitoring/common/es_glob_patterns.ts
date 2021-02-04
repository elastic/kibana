/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RegExPatterns {
  contains?: string | RegExp;
  negate?: string | RegExp;
}

const valid = /.*/;

export class ESGlobPatterns {
  public static createRegExPatterns(globPattern: string) {
    if (globPattern === '*') {
      return { contains: valid, negate: valid };
    }

    globPattern = globPattern.toLowerCase();
    globPattern = globPattern.replace(/[ \\\/?"<>|#]/g, '');
    const patternsArr = globPattern.split(',');
    const containPatterns: string[] = [];
    const negatePatterns: string[] = [];
    patternsArr.forEach((pattern) => {
      if (pattern.charAt(0) === '-') {
        negatePatterns.push(ESGlobPatterns.createESGlobRegExStr(pattern.slice(1)));
      } else {
        containPatterns.push(ESGlobPatterns.createESGlobRegExStr(pattern));
      }
    });
    const contains = containPatterns.length ? new RegExp(containPatterns.join('|'), 'gi') : valid;
    const negate = negatePatterns.length
      ? new RegExp(`^((?!(${negatePatterns.join('|')})).)*$`, 'gi')
      : valid;
    return { contains, negate };
  }

  public static isValid(value: string, patterns: RegExPatterns) {
    const { contains = valid, negate = valid } = patterns;
    return new RegExp(contains).test(value) && new RegExp(negate).test(value);
  }

  private static createESGlobRegExStr(pattern: string) {
    const patternsArr = pattern.split('*');
    const firstItem = patternsArr.shift();
    const lastItem = patternsArr.pop();
    const start = firstItem?.length ? `(^${ESGlobPatterns.escapeStr(firstItem)})` : '';
    const mid = patternsArr.map((group) => `(.*${ESGlobPatterns.escapeStr(group)})`);
    const end = lastItem?.length ? `(.*${ESGlobPatterns.escapeStr(lastItem)}$)` : '';
    const regExArr = ['(^', start, ...mid, end, ')'];
    return regExArr.join('');
  }

  private static escapeStr(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
}
