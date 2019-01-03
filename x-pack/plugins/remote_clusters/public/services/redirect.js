/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This depends upon Angular, which is why we use this provider pattern to access it within
// our React app.
let _redirect;

export function setRedirect(redirect) {
  _redirect = redirect;
}

export function redirect(path) {
  _redirect(path);
}
