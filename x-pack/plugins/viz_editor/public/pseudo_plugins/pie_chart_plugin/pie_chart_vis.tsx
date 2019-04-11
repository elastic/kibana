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
    fn(context: { rows: any[]; columns: any[] }, args: any) {
      // we have to reverse the order of the columns because the current kibana pie chart implementation always
      // expects the value column directly after the bucket column
      const columns = [...context.columns].reverse();
      return {
        ...context,
        columns,
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
  });
};
