/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fetchTextFromGit = async () => {
  const response = await fetch(
    'https://gist.githubusercontent.com/angorayc/f309427394ec304eaa7ccc6f57757f30/raw/780cf202f96fdb3d60273dd1eacd79d27f8380a8/hostrisk.console',
    { method: 'GET', headers: { Accept: 'application/vnd.github.v3.raw' } }
  )
    .then((response) => response.body)
    .then((rb) => {
      const reader = rb.getReader();

      return new ReadableStream({
        start(controller) {
          // The following function handles each data chunk
          function push() {
            // "done" is a Boolean and value a "Uint8Array"
            reader.read().then(({ done, value }) => {
              // If there is no more data to read
              if (done) {
                console.log('done', done);
                controller.close();
                return;
              }
              // Get the data and send it to the browser via the controller
              controller.enqueue(value);
              // Check chunks by logging to the console
              console.log(done, value);
              push();
            });
          }

          push();
        },
      });
    })
    .then((stream) => {
      // Respond with our stream
      return new Response(stream, { headers: { 'Content-Type': 'text/html' } }).text();
    })
    .then((result) => {
      // Do things with result
      console.log(result);
    });

  return response;
};
