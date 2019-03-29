/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';

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

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function sampleVisFunction() {
  return {
    name: 'pie_chart',
    type: 'kibana_datatable',
    args: {
      displayType: {
        types: ['string'],
      },
    },
    context: { types: ['kibana_datatable'] },
    fn(context: any, args: any) {
      // normally this would prepare the data, but in this case the kibana_pie function takes care of it
      // TODO swirtch over to elastic-charts pie as soon as they are ready
      return { ...context, type: 'kibana_datatable' };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
  });
};
