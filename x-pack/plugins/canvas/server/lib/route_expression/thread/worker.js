/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { populateServerRegistries } from '../../populate_server_registries';
import { interpretProvider } from '../../../../common/interpreter/interpret';
import { serializeProvider } from '../../../../common/lib/serialize';

const pluginsReady = populateServerRegistries(['commonFunctions', 'types']);
const heap = {};

process.on('message', msg => {
  const { type, id } = msg;
  const threadId = id;

  if (type === 'ping') process.send({ type: 'pong' });

  pluginsReady.then(({ commonFunctions, types }) => {
    const { serialize, deserialize } = serializeProvider(types.toJS());
    const interpret = interpretProvider({
      types: types.toJS(),
      functions: commonFunctions.toJS(),
      handlers: { environment: 'serverThreaded' },
      onFunctionNotFound: (ast, context) => {
        const id = uuid();
        // This needs to send a message to the main thread, and receive a response. Uhg.
        process.send({
          type: 'run',
          threadId,
          id,
          value: {
            ast,
            context: serialize(context),
          },
        });

        return new Promise(resolve => {
          heap[id] = resolve;
        });
      },
    });

    if (type === 'getFunctions')
      process.send({ type: 'functionList', value: Object.keys(commonFunctions.toJS()) });

    if (type === 'result') {
      const { id, value } = msg;
      heap[id](deserialize(value));
      delete heap[id];
    }

    if (type === 'run') {
      const { ast, context } = msg.value;

      interpret(ast, deserialize(context))
        .then(value => {
          // TODO: Serialize value
          process.send({ type: 'result', value: serialize(value), id });
        })
        .catch(value => {
          process.send({ type: 'error', value, id });
        });
    }
  });
});
