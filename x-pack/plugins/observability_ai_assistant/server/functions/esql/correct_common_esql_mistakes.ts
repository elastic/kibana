/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';

const DELIMITER_TOKENS = ['`', "'", '"'];
const ESCAPE_TOKEN = '\\\\';

function splitIntoCommands(query: string) {
  const commands: string[] = [];

  let delimiterToken: string | undefined;
  let currentCommand: string = '';

  const trimmed = query.trim();

  // @ts-expect-error
  // eslint-disable-next-line guard-for-in
  for (const indexAsString in trimmed) {
    const index = Number(indexAsString);
    const char = trimmed[index];

    if (!delimiterToken && char === '|') {
      commands.push(currentCommand.trim());
      currentCommand = '';
      continue;
    }

    currentCommand += char;

    if (delimiterToken === char) {
      // end identifier
      delimiterToken = undefined;
    } else if (
      !delimiterToken &&
      DELIMITER_TOKENS.includes(char) &&
      trimmed.substring(index - 2, index - 1) !== ESCAPE_TOKEN
    ) {
      // start identifier
      delimiterToken = char;
      continue;
    }
  }

  if (currentCommand) {
    commands.push(currentCommand.trim());
  }

  return commands;
}

function replaceSingleQuotesWithDoubleQuotes(command: string) {
  const regex = /(?<!\\)'/g;
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

function replaceFunctionsinSortWithEval(command: string) {
  const sortFunction = command.match(/[a-zA-Z_]+\([^\)]*\)(\.[^\)]*\))?/g)?.[0];
  return (
    'EVAL sort_key = ' +
    sortFunction +
    '\n| ' +
    command.replaceAll(/[a-zA-Z_]+\([^\)]*\)(\.[^\)]*\))?/g, 'sort_key ')
  );
}

function verifySortColumnInKeep(keepCommand: string, sortCommand: string) {
  const sortColumn = sortCommand.split(' ')[1];
  if (!keepCommand.includes(sortColumn)) {
    return keepCommand + ', ' + sortColumn;
  } else {
    return keepCommand;
  }
}

export function correctCommonEsqlMistakes(content: string, log: Logger) {
  return content.replaceAll(/```esql\n(.*?)\n```/gms, (_, query: string) => {
    const commands = splitIntoCommands(query);

    const correctedFormattedQuery = commands
      .map((command, index, array) => {
        const commandName = command.match(/^([A-Za-z]+)/)?.[1];

        let formattedCommand = command;

        switch (commandName) {
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

          case 'SORT':
            if (formattedCommand.match(/[a-zA-Z_]+\([^\)]*\)(\.[^\)]*\))?/g)) {
              formattedCommand = replaceFunctionsinSortWithEval(formattedCommand);
              break;
            }

          case 'KEEP':
            if (array.length < index + 1) {
              if (array[index + 1].match(/^([A-Za-z]+)/)?.[1] === 'SORT') {
                formattedCommand = verifySortColumnInKeep(formattedCommand, array[index + 1]);
                break;
              }
            }
        }
        return formattedCommand;
      })
      .join('\n| ');

    const originalFormattedQuery = commands.join('\n| ');

    if (originalFormattedQuery !== correctedFormattedQuery) {
      log.debug(`Modified query from: ${originalFormattedQuery}\nto:\n${correctedFormattedQuery}`);
    }

    return '```esql\n' + correctedFormattedQuery + '\n```';
  });
}
