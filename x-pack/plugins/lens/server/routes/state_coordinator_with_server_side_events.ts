/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import type { Response } from 'express';
import { STATE_PATCH_API_PATH } from '../../common/constants';
import { Patch } from '../../common/types';

const patches: Record<string, Array<{ patch: Patch; clientsReceived: Set<string> }>> = {};

interface Client {
  id: string;
  visId: string;
  response: Response;
}

const getPatchesForClient = (client: Client) =>
  patches[client.visId]
    ? patches[client.visId]
        .filter(({ clientsReceived }) => {
          if (!clientsReceived.has(client.id)) {
            clientsReceived.add(client.id);
            return true;
          }

          return false;
        })
        .map(({ patch }) => patch)
    : [];

export const setupStateCoordinatorServer = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get('/status', (request, response) => response.json({ clients: clients.length }));

  const PORT = 3000;

  let clients: Client[] = [];

  app.listen(PORT, () => {
    console.log(`Facts Events service listening at http://localhost:${PORT}`);
  });

  app.get(STATE_PATCH_API_PATH, (request, response, _next) => {
    const headers = {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    };
    response.writeHead(200, headers);

    const clientId = request.query.sessionId as string;

    const newClient = {
      id: clientId,
      visId: request.query.visId as string,
      response,
    };

    clients.push(newClient);

    const data = `data: ${JSON.stringify(getPatchesForClient(newClient))}\n\n`;

    response.write(data);

    request.on('close', () => {
      console.log(`${clientId} Connection closed`);
      clients = clients.filter((client) => client.id !== clientId);
    });
  });

  function broadcastPatches() {
    clients.forEach((client) => {
      const patchesForClient = getPatchesForClient(client);
      if (patchesForClient.length) {
        client.response.write(`data: ${JSON.stringify(patchesForClient)}\n\n`);
      }
    });
  }

  app.post(STATE_PATCH_API_PATH, (request, response, next) => {
    const patch: Patch = request.body.patch;
    if (!patches[request.body.visId]) {
      patches[request.body.visId] = [];
    }

    const patchRecord = {
      patch,
      clientsReceived: new Set([request.body.sessionId]),
    };
    patches[request.body.visId].push(patchRecord);

    response.status(200);
    return broadcastPatches();
  });

  app.delete(STATE_PATCH_API_PATH, async (req, res) => {
    delete patches[req.query.visId as string];

    return res.status(200);
  });
};
