/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import 'plugins/spaces/views/space_selector/space_selector.less';
import template from 'plugins/spaces/views/space_selector/space_selector.html';

import React from 'react';
import ReactDOM from 'react-dom';
import { SpaceSelector } from './space_selector';
import { mockSpaces } from '../../../common/mock_spaces';


chrome
  .setVisible(false)
  .setRootTemplate(template);

// hack to wait for angular template to be ready
const waitForAngularReady = new Promise(resolve => {
  const checkInterval = setInterval(() => {
    const hasElm = !!document.querySelector('#spaceSelectorRoot');
    if (hasElm) {
      clearInterval(checkInterval);
      resolve();
    }
  }, 10);
});

waitForAngularReady.then(() => {
  ReactDOM.render(<SpaceSelector spaces={mockSpaces} />, document.getElementById('spaceSelectorRoot'));
});


