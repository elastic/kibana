/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MATCH_FIELDS = /(%{\w*?:\w*?})/g;
const MATCH_AND_CAPTURE_FIELDS = /%{(\w*?):(\w*?)}/;

function isSinglePattern(pattern: string) {
  // if the pattern contains more than one field,
  // assume the fields can be edited
  return (pattern.match(MATCH_FIELDS) ?? []).length === 1;
}

export function splitGrok(grokPattern: string, filter: boolean = false) {
  const grokList = grokPattern.split(MATCH_FIELDS);
  return filter === true ? grokList.filter((d) => d[0] === '%' && d[1] === '{') : grokList;
}

export function getGrokField(field: string) {
  if (field[0] !== '%' && field[1] !== '{') {
    return { valid: false, type: '', name: '' };
  }

  const match = field.match(MATCH_AND_CAPTURE_FIELDS);
  if (match === null) {
    return { valid: false, type: '', name: '' };
  }

  const [, type, name] = match;
  return { valid: true, type, name };
}

export function getFieldsFromGrokPattern(grokPattern: string) {
  if (isSinglePattern(grokPattern)) {
    return [];
  }

  return splitGrok(grokPattern, true).map((d) => {
    const { valid, name, type } = getGrokField(d);
    if (valid === false) {
      return { name: d, type };
    }
    return { name, type };
  });
}

export function replaceFieldInGrokPattern(grokPattern: string, fieldName: string, index: number) {
  if (isSinglePattern(grokPattern)) {
    return grokPattern;
  }

  let count = 0;
  return splitGrok(grokPattern)
    .map((d) => {
      const { valid, type } = getGrokField(d);
      if (valid) {
        if (count === index) {
          count++;
          const newField = `%{${type}:${fieldName}}`;
          const { valid: validNew } = getGrokField(newField);
          // don't replace if new field is not valid
          return validNew ? newField : d;
        }
        count++;
      }
      return d;
    })
    .join('');
}
