/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import http from 'http';

const ACCESS_TOKEN_PATH = '/oauth/token';
const TOKEN_EXPIRATION_TIME = 1; // seconds

export interface TokenRequest {
  timestamp: number;
  token: string;
  client_id: string;
  client_secret: string;
  grant_type: string;
}

export interface OAuth2Server {
  server: http.Server;
  getAccessTokenUrl: () => string;
  getTokenRequests: () => Array<TokenRequest>;
  getTokenExpirationTime: () => number;
  reset: () => void;
}
export const getOAuth2Server = async (port: number = 3001): Promise<OAuth2Server> => {
  let tokenRequests: TokenRequest[] = [];
  let requestCounter = 0;

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === ACCESS_TOKEN_PATH) {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        const params = new URLSearchParams(body);
        const grantType = params.get('grant_type');
        const clientId = params.get('client_id');
        const clientSecret = params.get('client_secret');

        if (grantType !== 'client_credentials' || !clientId || !clientSecret) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error:
                'Auth token server - critical error: wrong grant type, missing client_id or missing client_secret',
            })
          );
          return;
        }

        const token = 'test-token-' + ++requestCounter;
        tokenRequests.push({
          timestamp: Date.now(),
          token,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: grantType,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            access_token: token,
            token_type: 'Bearer',
            expires_in: TOKEN_EXPIRATION_TIME,
          })
        );
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const reset = () => {
    requestCounter = 0;
    tokenRequests = [];
  };

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        server,
        getAccessTokenUrl: () => `http://127.0.0.1:${port}${ACCESS_TOKEN_PATH}`,
        getTokenRequests: () => [...tokenRequests],
        getTokenExpirationTime: () => TOKEN_EXPIRATION_TIME,
        reset,
      });
    });
  });
};
