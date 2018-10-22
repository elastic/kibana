/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { populateServerRegistries } from '../../server_registries';
import { interpretProvider } from '../../../../common/interpreter/interpret';
import { serializeProvider } from '../../../../common/lib/serialize';

// We actually DO need populateServerRegistries here since this is a different node process
const pluginsReady = populateServerRegistries(['commonFunctions', 'types']);
const heap = {};

process.on('message', msg => {
  const { type, id, value } = msg;
  const threadId = id;

  pluginsReady.then(({ commonFunctions, types }) => {
    types = types.toJS();
    const { serialize, deserialize } = serializeProvider(types);
    const interpret = interpretProvider({
      types,
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

        // Note that there is no facility to reject here. That's because this would only occur as the result of something that happens in the main thread, and we reject there
        return new Promise(resolve => {
          heap[id] = { resolve };
        });
      },
    });

    if (type === 'getFunctions')
      process.send({ type: 'functionList', value: Object.keys(commonFunctions.toJS()) });

    if (type === 'msgSuccess') {
      heap[id].resolve(deserialize(value));
      delete heap[id];
    }

    if (type === 'run') {
      const { ast, context } = msg.value;

      interpret(ast, deserialize(context))
        .then(value => {
          process.send({ type: 'msgSuccess', value: serialize(value), id });
        })
        // TODO: I don't think it is even possible to hit this
        .catch(value => {
          process.send({ type: 'msgError', value, id });
        });
    }
  });
});
