/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type { Logger } from '@kbn/logging';

const DELIMITER_TOKENS = ['`', "'", '"', ['(', ')']];
const ESCAPE_TOKEN = '\\\\';

// this function splits statements by a certain token,
// and takes into account escaping, or function calls

function split(value: string, splitToken: string) {
  const statements: string[] = [];

  let delimiterToken: string | undefined;
  let currentStatement: string = '';

  const trimmed = value.trim().split('');

  for (let index = 0; index < trimmed.length; index++) {
    const char = trimmed[index];

    if (
      !delimiterToken &&
      trimmed.slice(index, index + splitToken.length).join('') === splitToken
    ) {
      index += splitToken.length - 1;
      statements.push(currentStatement.trim());
      currentStatement = '';
      continue;
    }

    currentStatement += char;

    if (delimiterToken === char) {
      // end identifier
      delimiterToken = undefined;
    } else if (!delimiterToken && trimmed[index - 1] !== ESCAPE_TOKEN) {
      const applicableToken = DELIMITER_TOKENS.find(
        (token) => token === char || (isArray(token) && token[0] === char)
      );
      if (applicableToken) {
        // start identifier
        delimiterToken = isArray(applicableToken) ? applicableToken[1] : applicableToken;
        continue;
      }
    }
  }

  if (currentStatement) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

function splitIntoCommands(query: string) {
  const commands: string[] = split(query, '|');

  return commands.map((command) => {
    const commandName = command.match(/^([A-Za-z]+)/)?.[1];

    return {
      name: commandName,
      command,
    };
  });
}

function replaceSingleQuotesWithDoubleQuotes(command: string) {
  const regex = /'(?=(?:[^"]*"[^"]*")*[^"]*$)/g;
  return command.replace(regex, '"');
}

function replaceAsKeywordWithAssignments(command: string) {
  return command.replaceAll(/^STATS\s*(.*)/g, (__, statsOperations: string) => {
    return `STATS ${statsOperations.replaceAll(
      /(,\s*)?(.*?)\sAS\s([`a-zA-Z0-9.\-_]+)/g,
      '$1$3 = $2'
    )}`;
  });
}

function isValidColumnName(column: string) {
  return column.match(/^`.*`$/) || column.match(/^[@A-Za-z\._\-]+$/);
}

function verifyKeepColumns(
  keepCommand: string,
  nextCommands: Array<{ name?: string; command: string }>
) {
  const columnsInKeep = split(keepCommand.replace(/^KEEP\s*/, ''), ',').map((statement) =>
    split(statement, '=')?.[0].trim()
  );

  const availableColumns = columnsInKeep.concat();

  for (const { name, command } of nextCommands) {
    if (['STATS', 'KEEP', 'DROP', 'DISSECT', 'GROK', 'ENRICH'].includes(name || '')) {
      // these operations alter columns in a way that is hard to analyze, so we abort
      break;
    }

    const commandBody = command.replace(/^[A-Za-z]+\s*/, '');

    if (name === 'EVAL') {
      // EVAL creates new columns, make them available
      const columnsInEval = split(commandBody, ',').map((column) =>
        split(column.trim(), '=')[0].trim()
      );

      columnsInEval.forEach((column) => {
        availableColumns.push(column);
      });
    }

    if (name === 'RENAME') {
      // RENAME creates and removes columns
      split(commandBody, ',').forEach((statement) => {
        const [prevName, newName] = split(statement, 'AS').map((side) => side.trim());
        availableColumns.push(newName);
        if (!availableColumns.includes(prevName)) {
          columnsInKeep.push(prevName);
        }
      });
    }

    if (name === 'SORT') {
      const columnsInSort = split(commandBody, ',').map((column) =>
        split(column.trim(), ' ')[0].trim()
      );

      columnsInSort.forEach((column) => {
        if (isValidColumnName(column) && !availableColumns.includes(column)) {
          columnsInKeep.push(column);
        }
      });
    }
  }

  return `KEEP ${columnsInKeep.join(', ')}`;
}

export function correctCommonEsqlMistakes(content: string, log: Logger) {
  return content.replaceAll(/```esql\n(.*?)\n```/gms, (_, query: string) => {
    const commands = splitIntoCommands(query);

    const formattedCommands: string[] = commands.map(({ name, command }, index) => {
      let formattedCommand = command;

      switch (name) {
        case 'FROM':
          formattedCommand = formattedCommand
            .replaceAll(/FROM "(.*)"/g, 'FROM `$1`')
            .replaceAll(/FROM '(.*)'/g, 'FROM `$1`');
          break;

        case 'WHERE':
        case 'EVAL':
          formattedCommand = replaceSingleQuotesWithDoubleQuotes(formattedCommand);
          break;

        case 'STATS':
          formattedCommand = replaceAsKeywordWithAssignments(formattedCommand);
          break;

        case 'KEEP':
          formattedCommand = verifyKeepColumns(formattedCommand, commands.slice(index + 1));
          break;
      }
      return formattedCommand;
    });

    const correctedFormattedQuery = formattedCommands.join('\n| ');

    const originalFormattedQuery = commands.map((cmd) => cmd.command).join('\n| ');

    if (originalFormattedQuery !== correctedFormattedQuery) {
      log.debug(`Modified query from: ${originalFormattedQuery}\nto:\n${correctedFormattedQuery}`);
    }

    return '```esql\n' + correctedFormattedQuery + '\n```';
  });
}
