/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, last } from 'lodash';

export function initializePathScript(field: string) {
  return field.split('.').reduce((acc, _part, currentIndex, parts) => {
    const currentSegment = parts.slice(0, currentIndex + 1).join('.');
    const next = `
        if (ctx.${currentSegment} == null) {
            ctx.${currentSegment} = new HashMap();
        }
      `;
    return `${acc}\n${next}`;
  }, '');
}

export function cleanScript(script: string) {
  const codeLines = script
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  let cleanedScript = '';
  let indentLevel = 0;

  for (let i = 0; i < codeLines.length; i++) {
    if (i === 0) {
      cleanedScript += `${codeLines[i]}\n`;
      continue;
    }

    const previousLine = i === 0 ? null : codeLines[i - 1];
    const currentLine = codeLines[i];

    if (last(previousLine) === '{') {
      indentLevel++;
    } else if (first(currentLine) === '}') {
      indentLevel--;
    }

    const indent = new Array(indentLevel).fill('  ').join('');
    cleanedScript += `${indent}${currentLine}\n`;
  }

  return cleanedScript.trim();
}
