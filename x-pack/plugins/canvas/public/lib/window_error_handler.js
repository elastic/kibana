/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as knownErrors from '../../common/lib/errors';

const oldHandler = window.onerror;

function showError(err) {
  const body = document.querySelector('body');
  const notice = document.createElement('div');
  notice.classList.add('window-error');

  const close = document.createElement('a');
  close.textContent = 'close';
  close.onclick = (ev) => {
    ev.preventDefault();
    body.removeChild(notice);
  };
  notice.appendChild(close);

  notice.insertAdjacentHTML('beforeend', '<h3>Uncaught error swallowed in dev mode</h3>');

  const message = document.createElement('p');
  message.textContent = `Error: ${err.message}`;
  notice.appendChild(message);

  if (err.stack) {
    const stack = document.createElement('pre');
    stack.textContent = err.stack.split('\n').slice(0, 2).concat('...').join('\n');
    notice.appendChild(stack);
  }

  notice.insertAdjacentHTML('beforeend', `<p>Check console for more information</p>`);
  body.appendChild(notice);
}

window.canvasInitErrorHandler = () => {
  // React will delegate to window.onerror, even when errors are caught with componentWillCatch,
  // so check for a known custom error type and skip the default error handling when we find one
  window.onerror = (...args) => {
    const [message, , , , err] = args;

    // ResizeObserver error does not have an `err` object
    // It is thrown during workpad loading due to layout thrashing
    // https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
    // https://github.com/elastic/eui/issues/3346
    console.log(message);
    const isKnownError =
      message.includes('ResizeObserver loop') ||
      Object.keys(knownErrors).find((errorName) => {
        return err.constructor.name === errorName || message.indexOf(errorName) >= 0;
      });
    if (isKnownError) {
      return;
    }

    // uncaught errors are silenced in dev mode
    // NOTE: react provides no way I can tell to distingish that an error came from react, it just
    // throws generic Errors. In development mode, it throws those errors even if you catch them in
    // an error boundary. This uses in the stack trace to try to detect it, but that stack changes
    // between development and production modes. Fortunately, beginWork exists in both, so it uses
    // a mix of the runtime mode and checking for another react method (renderRoot) for development
    // TODO: this is *super* fragile. If the React method names ever change, which seems kind of likely,
    // this check will break.
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      // TODO: we should do something here to let the user know something failed,
      // but we don't currently have an error logging service
      console.error(err);
      console.warn(`*** Uncaught error swallowed in dev mode ***

  Check and fix the above error. This will blow up Kibana when run in production mode!`);
      showError(err);
      return;
    }

    // fall back to the default kibana uncaught error handler
    oldHandler(...args);
  };
};

window.canvasRestoreErrorHandler = () => {
  window.onerror = oldHandler;
};
