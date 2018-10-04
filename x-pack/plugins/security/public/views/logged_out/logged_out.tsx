/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import template from 'plugins/security/views/logged_out/logged_out.html';
import 'plugins/security/views/logged_out/logged_out.less';
import React from 'react';
import { render } from 'react-dom';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';

import { LoggedOutPage } from './components';

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('logout', ($scope: AnyObject) => {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('reactLoggedOutRoot');
      render(<LoggedOutPage />, domNode);
    });
  });
