/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import ace from 'brace';
import { ADDITION_PREFIX, REMOVAL_PREFIX } from './diff_tools';

function findInObject(key, obj, debug) {
  const objKeys = Object.keys(obj);
  for (const objKey of objKeys) {
    if (objKey === key) {
      return obj[objKey];
    }
    if (typeof obj[objKey] === 'object' && !Array.isArray(obj[objKey])) {
      const item = findInObject(key, obj[objKey], debug);
      if (item !== false) {
        return item;
      }
    }
  }
  return false;
}

/**
 * Utilty method that will determine if the current key/value pair
 * is an addition or removal and return the appropriate ace classes
 * for styling. This is called after finding a valid key/value match
 * in our custom JSON diff mode for ace.
 *
 * @param {string} key
 * @param {string} val
 * @param {object} jsonObject
 */
function getDiffClasses(key, val, jsonObject) {
  let value = val;
  if (value.endsWith(',')) {
    value = value.slice(0, -1);
  }
  if (value.startsWith('"')) {
    value = value.slice(1, -1);
  }

  const additionValue = findInObject(`${ADDITION_PREFIX}${key}`, jsonObject);
  const removalValue = findInObject(`${REMOVAL_PREFIX}${key}`, jsonObject);

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

  return diffClasses;
}

let currentJsonObject;
const getCurrentJsonObject = () => currentJsonObject;
export const setCurrentJsonObject = jsonObject => currentJsonObject = jsonObject;

/**
 * This function will update the ace editor to support a `DiffJsonMode` that will
 * show a merged object (merged through `diff_tools:mergeAndPreserveDuplicateKeys`)
 * and highlight additions and removals. The goal of this from a UI perspective is
 * to help the user see a visual result of merging two javascript objects.
 *
 * Read this as a starter: https://github.com/ajaxorg/ace/wiki/Creating-or-Extending-an-Edit-Mode
 */
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
            // This is designed to match a key:value pair represented in JSON
            // like:
            //    "foo": "bar"
            // Be aware when tweaking this that there are idiosyncracies with
            // how these work internally in ace.
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
