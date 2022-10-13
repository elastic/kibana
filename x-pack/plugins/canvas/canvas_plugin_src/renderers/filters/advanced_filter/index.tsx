/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { StartInitializer } from '../../../plugin';
import { RendererFactory } from '../../../../types';
import { AdvancedFilter } from './component';
import { RendererStrings } from '../../../../i18n';

const { advancedFilter: strings } = RendererStrings;

export const advancedFilterFactory: StartInitializer<RendererFactory<{}>> =
  (core, plugins) => () => ({
    name: 'advanced_filter',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    height: 50,
    render(domNode, _, handlers) {
      ReactDOM.render(
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <AdvancedFilter
            commit={(filter) => handlers.event({ name: 'applyFilterAction', data: filter })}
            value={handlers.getFilter()}
          />
        </KibanaThemeProvider>,
        domNode,
        () => handlers.done()
      );

      handlers.onDestroy(() => {
        ReactDOM.unmountComponentAtNode(domNode);
      });
    },
  });
