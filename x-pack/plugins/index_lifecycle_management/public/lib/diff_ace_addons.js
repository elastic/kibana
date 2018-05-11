/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import ace from 'brace';
import { ADDITION_PREFIX, REMOVAL_PREFIX } from './diff_tools';

function findInObject(key, obj, debug) {
  // debug && console.log('findInObject()', key, obj);
  const objKeys = Object.keys(obj);
  for (const objKey of objKeys) {
    if (objKey === key) {
      // debug && console.log('findInObject() FOUND', key);
      return obj[objKey];
    }
    if (typeof obj[objKey] === 'object' && !Array.isArray(obj[objKey])) {
      const item = findInObject(key, obj[objKey], debug);
      if (item !== false) {
        // debug && console.log('findInObject() FOUND 2', key);
        return item;
      }
    }
  }
  // debug && console.log('findInObject() NOT FOUND', key);
  return false;
}

function getDiffClasses(key, val, jsonObject) {
  const debug = false;//key === 'name' && val === '"t"';

  debug && console.log('getDiffClasses()', key, val);

  let value = val;
  if (value.endsWith(',')) {
    value = value.slice(0, -1);
  }
  if (value.startsWith('"')) {
    value = value.slice(1, -1);
  }

  const additionValue = findInObject(`${ADDITION_PREFIX}${key}`, jsonObject, debug);
  const removalValue = findInObject(`${REMOVAL_PREFIX}${key}`, jsonObject, debug);

  const isAddition = Array.isArray(additionValue)
    ? !!additionValue.find(v => v === value)
    : (additionValue === value || (additionValue && value === '{'));
  const isRemoval = Array.isArray(removalValue)
    ? !!removalValue.find(v => v === value)
    : (removalValue === value || (removalValue && value === '{'));

  let diffClasses = '';
  if (isAddition) {
    diffClasses = 'diff_addition ace_variable';
  } else if (isRemoval) {
    diffClasses = 'diff_removal ace_variable';
  } else {
    diffClasses = 'variable';
  }

  debug && console.log(`getDiffClasses()
    key='${key}'
    value='${value}'
    additionValue='${additionValue}'
    removalValue='${removalValue}'
    isAddition=${isAddition}
    isRemoval=${isRemoval}
    diffClasses='${diffClasses}'
  `);

  return diffClasses;
}

let currentJsonObject;
const getCurrentJsonObject = () => currentJsonObject;
export const setCurrentJsonObject = jsonObject => currentJsonObject = jsonObject;

export const addDiffAddonsForAce = () => {
  const JsonHighlightRules = ace.acequire('ace/mode/json_highlight_rules')
    .JsonHighlightRules;
  class DiffJsonHighlightRules extends JsonHighlightRules {
    constructor(props) {
      super(props);
      this.$rules = new JsonHighlightRules().getRules();

      let currentArrayKey;
      this.addRules({
        start: [
          {
            token: (key, val) => {
              return getDiffClasses(key, val, getCurrentJsonObject());
            },
            regex: '(?:"([\\w-+]+)"\\s*:\\s*([^\\n\\[]+)$)',
          },
          {
            token: key => {
              currentArrayKey = key;
              return 'variable';
            },
            next: 'array',
            regex: '(?:"([\\w-+]+)"\\s*:\\s*\\[$)',
          },
          ...this.$rules.start,
        ],
        array: [
          {
            token: val => {
              return getDiffClasses(currentArrayKey, val, getCurrentJsonObject());
            },
            next: 'start',
            regex: '\\s*"([^"]+)"\\s*',
          },
        ],
      });
    }
  }

  const JsonMode = ace.acequire('ace/mode/json').Mode;
  class DiffJsonMode extends JsonMode {
    constructor(props) {
      super(props);
      this.HighlightRules = DiffJsonHighlightRules;
    }
  }

  ace.define('ace/mode/diff_json', [], () => ({
    Mode: DiffJsonMode,
  }));
};
