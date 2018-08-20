/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


const messages = [];


const MSG_STYLE = { INFO: 'ml-message-info', WARNING: 'ml-message-warning', ERROR: 'ml-message-error' };

function getMessages() {
  return messages;
}

function addMessage(msg) {
  if (messages.find(m => (m.text === msg.text && m.style === msg.style)) === undefined) {
    messages.push(msg);
  }
}

function removeMessage(index) {
  messages.splice(index, 1);
}

function clear() {
  messages.length = 0;
}

function info(text) {
  addMessage({ text, style: MSG_STYLE.INFO });
}

function warning(text) {
  addMessage({ text, style: MSG_STYLE.WARNING });
}

function error(text, resp) {
  text = `${text} ${expandErrorMessageObj(resp)}`;
  addMessage({ text, style: MSG_STYLE.ERROR });
}

function expandErrorMessageObj(resp) {
  let txt = '';
  if (resp !== undefined && typeof resp === 'object') {
    try {
      const respObj = JSON.parse(resp.response);
      if (typeof respObj === 'object' && respObj.error !== undefined) {
        txt = respObj.error.reason;
      }
    } catch(e) {
      txt = resp.message;
    }
  }
  return txt;
}

export const mlMessageBarService = {
  getMessages,
  addMessage,
  removeMessage,
  clear,
  info,
  warning,
  error
};
