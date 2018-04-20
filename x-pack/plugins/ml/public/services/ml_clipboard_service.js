/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// service for copying text to the users clipboard
// can only work when triggered via a user event, as part of an onclick or ng-click
// returns success
// e.g. mlClipboardService.copy("this could be abused!");

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlClipboardService', function () {

  function copyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = 0;
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.value = text;

    document.body.appendChild(textArea);

    textArea.select();

    let successful = false;
    try {
      successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      console.log('Copying text command was ' + msg);
    } catch (err) {
      console.log('Oops, unable to copy');
    }

    document.body.removeChild(textArea);
    return successful;
  }

  this.copy = copyTextToClipboard;
});

