/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';
import { registerFunctions } from './frame/interpreter_functions';
import { Main } from './frame/main';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { getInterpreter } from 'plugins/interpreter/interpreter';
// @ts-ignore
import { registries, renderersRegistry } from 'plugins/interpreter/registries';
import { registerPipeline as registerXYPipeline } from '../xy_chart_plugin';

// TODO: Convert this to the "new platform" way of doing UI
function App($scope: any, $element: Element[]) {
  const el = $element[0];

  $scope.$on('$destroy', () => unmountComponentAtNode(el));

  return render(
    <I18nProvider>
      <Main getInterpreter={getInterpreter} renderersRegistry={renderersRegistry} />
    </I18nProvider>,
    el
  );
}

chrome.setRootController('vizEditor', App);

registerFunctions(registries);

// TODO this is just a workaround for now because the xychart doesn't have it's own plugin yet.
// As soon as it has, the entrypoint of this plugin should take care of this
registerXYPipeline(registries);
