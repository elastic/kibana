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
      trimmed
        .slice(index, index + splitToken.length)
        .join('')
        .toLowerCase() === splitToken.toLowerCase()
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

export function splitIntoCommands(query: string) {
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

function removeColumnQuotesAndEscape(column: string) {
  const plainColumnIdentifier = column.replaceAll(/^"(.*)"$/g, `$1`).replaceAll(/^'(.*)'$/g, `$1`);

  if (isValidColumnName(plainColumnIdentifier)) {
    return plainColumnIdentifier;
  }

  return '`' + plainColumnIdentifier + '`';
}

function replaceAsKeywordWithAssignments(command: string) {
  return command.replaceAll(/^STATS\s*(.*)/g, (__, statsOperations: string) => {
    return `STATS ${statsOperations.replaceAll(
      /(,\s*)?(.*?)\s(AS|as)\s([`a-zA-Z0-9.\-_]+)/g,
      '$1$4 = $2'
    )}`;
  });
}

function isValidColumnName(column: string) {
  return Boolean(column.match(/^`.*`$/) || column.match(/^[@A-Za-z\._\-\d]+$/));
}

function escapeColumns(line: string) {
  const [, command, body] = line.match(/^([A-Za-z_]+)(.*)$/s) ?? ['', '', ''];

  const escapedBody = split(body.trim(), ',')
    .map((statement) => {
      const [lhs, rhs] = split(statement, '=');
      if (!rhs) {
        return lhs;
      }
      return `${removeColumnQuotesAndEscape(lhs)} = ${rhs}`;
    })
    .join(', ');

  return `${command} ${escapedBody}`;
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

function escapeExpressionsInSort(sortCommand: string) {
  const columnsInSort = split(sortCommand.replace(/^SORT\s*/, ''), ',')
    .map((statement) => split(statement, '=')?.[0].trim())
    .map((columnAndSortOrder) => {
      let [, column, sortOrder = ''] = columnAndSortOrder.match(/^(.*?)\s*(ASC|DESC)?$/i) || [];
      if (!column) {
        return columnAndSortOrder;
      }

      if (sortOrder) sortOrder = ` ${sortOrder}`;

      if (!column.match(/^[a-zA-Z0-9_\.@]+$/)) {
        column = `\`${column}\``;
      }

      return `${column}${sortOrder}`;
    });

  return `SORT ${columnsInSort.join(', ')}`;
}

function ensureEqualityOperators(whereCommand: string) {
  const body = whereCommand.split(/^WHERE /)[1];

  const byChar = body.split('');

  let next = '';
  let isColumnName = false;
  byChar.forEach((char, index) => {
    next += char;

    if (!isColumnName && char === '=' && byChar[index - 1] === ' ' && byChar[index + 1] === ' ') {
      next += '=';
    }

    if (!isColumnName && (char === '`' || char.match(/[a-z@]/i))) {
      isColumnName = true;
    } else if (isColumnName && (char === '`' || !char.match(/[a-z@0-9]/i))) {
      isColumnName = false;
    }
  });

  return `WHERE ${next}`;
}

export function correctCommonEsqlMistakes(content: string, log: Logger) {
  return content.replaceAll(/```esql\n(.*?)\n```/gms, (_, query: string) => {
    const commands = splitIntoCommands(query.trim());

    const formattedCommands: string[] = commands.map(({ name, command }, index) => {
      let formattedCommand = command;

      switch (name) {
        case 'FROM':
          formattedCommand = formattedCommand
            .replaceAll(/FROM "(.*)"/g, 'FROM $1')
            .replaceAll(/FROM '(.*)'/g, 'FROM $1')
            .replaceAll(/FROM `(.*)`/g, 'FROM $1');
          break;

        case 'WHERE':
          formattedCommand = replaceSingleQuotesWithDoubleQuotes(formattedCommand);
          formattedCommand = ensureEqualityOperators(formattedCommand);
          break;

        case 'EVAL':
          formattedCommand = replaceSingleQuotesWithDoubleQuotes(formattedCommand);
          formattedCommand = escapeColumns(formattedCommand);
          break;

        case 'STATS':
          formattedCommand = replaceAsKeywordWithAssignments(formattedCommand);
          const [before, after] = split(formattedCommand, ' BY ');
          formattedCommand = escapeColumns(before);
          if (after) {
            formattedCommand += ` BY ${after}`;
          }
          break;

        case 'KEEP':
          formattedCommand = verifyKeepColumns(formattedCommand, commands.slice(index + 1));
          break;

        case 'SORT':
          formattedCommand = escapeExpressionsInSort(formattedCommand);
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
