/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';

// TODO these imports are only here to support the legacy chart renderers (kibana_pie, kibana_gauge, ...)
// When we switch to elastic-charts completely, they can be removed
// This is required so some default styles and required scripts/Angular modules are loaded,
// or the timezone setting is correctly applied.
import 'ui/autoload/all';
// These are all the required uiExports you need to import in case you want to embed visualizations.
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';
import 'uiExports/search';
import 'uiExports/visEditorTypes';
import 'uiExports/visRequestHandlers';
import 'uiExports/visResponseHandlers';
import 'uiExports/visTypes';
import 'uiExports/visualize';

import { registerFunctions } from './frame/interpreter_functions';
import { Main } from './frame/main';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
// @ts-ignore
import { getInterpreter } from 'plugins/interpreter/interpreter';
// @ts-ignore
import { registries, renderersRegistry } from 'plugins/interpreter/registries';
import { registerPipeline as registerCSVPipeline } from './pseudo_plugins/csv_datasource_plugin';
import { registerPipeline as registerESSQLPipeline } from './pseudo_plugins/essql_datasource_plugin';
import { registerPipeline as registerIndexpatternPipeline } from './pseudo_plugins/indexpattern_datasource_plugin';
import { registerPipeline as registerMetricPipeline } from './pseudo_plugins/metric_chart_plugin';
import { registerPipeline as registerPiePipeline } from './pseudo_plugins/pie_chart_plugin';
import { registerPipeline as registerVegaPipeline } from './pseudo_plugins/vega_chart_plugin';
import { registerPipeline as registerXYPipeline } from './pseudo_plugins/xy_chart_plugin';

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

// TODO this is just a workaround for now because the charts and datasources doesn't have it's own plugin yet.
// As soon as it has, the entrypoint of this plugin should take care of this
registerXYPipeline(registries);
registerPiePipeline(registries);
registerVegaPipeline(registries);
registerMetricPipeline(registries);
registerCSVPipeline(registries);
registerESSQLPipeline(registries);
registerIndexpatternPipeline(registries);
