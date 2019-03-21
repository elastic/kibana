/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';

import { OverwrittenSessionPage } from './components';

chrome
  .setVisible(false)
  .setRootTemplate('<div id="reactOverwrittenSessionRoot" />')
  .setRootController('overwritten_session', ($scope: any, ShieldUser: any) => {
    $scope.$$postDigest(() => {
      ShieldUser.getCurrent().$promise.then((user: any) => {
        render(
          <I18nContext>
            <OverwrittenSessionPage addBasePath={chrome.addBasePath} user={user} />
          </I18nContext>,
          document.getElementById('reactOverwrittenSessionRoot')
        );
      });
    });
  });
