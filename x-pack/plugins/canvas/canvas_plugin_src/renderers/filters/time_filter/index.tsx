/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { toExpression } from '@kbn/interpreter';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { syncFilterExpression } from '../../../../public/lib/sync_filter_expression';
import { RendererStrings } from '../../../../i18n';
import { TimeFilter } from './components';
import { StartInitializer } from '../../../plugin';
import { RendererHandlers } from '../../../../types';
import { Arguments } from '../../../functions/common/timefilterControl';
import { RendererFactory } from '../../../../types';

const { timeFilter: strings } = RendererStrings;

const defaultTimeFilterExpression = 'timefilter column=@timestamp from=now-24h to=now';

export const timeFilterFactory: StartInitializer<RendererFactory<Arguments>> = (core, plugins) => {
  const { uiSettings, theme } = core;

  const customQuickRanges = (uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES) || []).map(
    ({ from, to, display }: { from: string; to: string; display: string }) => ({
      start: from,
      end: to,
      label: display,
    })
  );

  const customDateFormat = uiSettings.get('dateFormat');

  return () => ({
    name: 'time_filter',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true, // must be true, otherwise popovers don't work
    render: async (domNode: HTMLElement, config: Arguments, handlers: RendererHandlers) => {
      let filterExpression = handlers.getFilter();

      if (filterExpression === undefined || filterExpression.indexOf('timefilter') !== 0) {
        filterExpression = defaultTimeFilterExpression;
        handlers.event({ name: 'applyFilterAction', data: filterExpression });
      } else if (filterExpression !== '') {
        // NOTE: setFilter() will cause a data refresh, avoid calling unless required
        // compare expression and filter, update filter if needed
        const { changed, newAst } = syncFilterExpression(config, filterExpression, [
          'column',
          'filterGroup',
        ]);

        if (changed) {
          handlers.event({ name: 'applyFilterAction', data: toExpression(newAst) });
        }
      }

      ReactDOM.render(
        <KibanaThemeProvider theme$={theme.theme$}>
          <TimeFilter
            commit={(filter) => handlers.event({ name: 'applyFilterAction', data: filter })}
            filter={filterExpression}
            commonlyUsedRanges={customQuickRanges}
            dateFormat={customDateFormat}
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
};
