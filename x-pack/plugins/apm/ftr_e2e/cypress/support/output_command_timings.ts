/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const commands: Array<{
  name: string;
  args: string;
  started: number;
  endedAt?: number;
  elapsed: number;
}> = [];

Cypress.on('test:after:run', (attributes, test) => {
  if (attributes.state === 'pending') {
    return;
  }

  /* eslint-disable no-console */
  console.log(
    'Test "%s" has finished in %dms',
    attributes.title,
    attributes.duration
  );

  let totalElapsed = 0;

  const commandsOutput = commands.map((e) => {
    totalElapsed = totalElapsed + e.elapsed;
    const startedDate = new Date(e.started);
    return {
      ...e,
      started: `${startedDate.toLocaleTimeString()}:${startedDate.getMilliseconds()}`,
      totalElapsed,
    };
  });

  commands.length = 0;
  console.table(commandsOutput);

  if (test.state === 'failed') {
    throw new Error(JSON.stringify(commandsOutput));
  }
});

Cypress.on('command:start', (c) => {
  commands.push({
    name: c.attributes.name,
    args: c.attributes.args
      .slice(0, 5)
      .map((arg: unknown) => JSON.stringify(arg))
      .join(','),
    started: new Date().getTime(),
    elapsed: 0,
  });
});

Cypress.on('command:end', (c) => {
  const lastCommand = commands[commands.length - 1];

  if (lastCommand.name !== c.attributes.name) {
    throw new Error('Last command is wrong');
  }

  lastCommand.endedAt = new Date().getTime();
  lastCommand.elapsed = lastCommand.endedAt - lastCommand.started;
});
