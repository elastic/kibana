/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { IScope } from 'angular';
import React, { useCallback } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';

import { PLUGIN_ID } from '../common';

import { editorFrame } from '.';

// Side effect of loading this is to register
import './indexpattern_datasource';

function Lens() {
  const renderFrame = useCallback(node => {
    if (node !== null) {
      editorFrame.render(node);
    }
  }, []);

  return (
    <I18nProvider>
      <div>
        <h1>Lens</h1>

        <div ref={renderFrame} />
      </div>
    </I18nProvider>
  );
}

// TODO: Convert this to the "new platform" way of doing UI
function App($scope: IScope, $element: JQLite) {
  const el = $element[0];
  $scope.$on('$destroy', () => unmountComponentAtNode(el));

  return render(<Lens />, el);
}

chrome.setRootController(PLUGIN_ID, App);
