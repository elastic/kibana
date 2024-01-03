/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import {
  LensAttributes,
  LensConfig,
  LensConfigBuilder,
} from '@kbn/lens-embeddable-utils/config_builder';
import { InfraClientStartDeps } from '../types';

export type UseLensAttributesParams = LensConfig;

export const useLensAttributes = (params: UseLensAttributesParams) => {
  const {
    services: { lens, dataViews },
  } = useKibana<InfraClientStartDeps>();
  const { navigateToPrefilledEditor } = lens;

  const { value: attributes, error } = useAsync(async () => {
    const { formula: formulaAPI } = await lens.stateHelperApi();
    if (!dataViews || !formulaAPI) {
      return null;
    }

    const builder = new LensConfigBuilder(formulaAPI, dataViews);

    return (await builder.build(params)) as LensAttributes;
  });

  const injectFilters = useCallback(
    ({ filters, query }: { filters: Filter[]; query: Query }): LensAttributes | null => {
      if (!attributes) {
        return null;
      }

      return {
        ...attributes,
        state: {
          ...attributes.state,
          query,
          filters: [...attributes.state.filters, ...filters],
        },
      };
    },
    [attributes]
  );

  const openInLensAction = useCallback(
    ({
        timeRange,
        query,
        filters,
        searchSessionId,
      }: {
        timeRange: TimeRange;
        filters: Filter[];
        query: Query;
        searchSessionId?: string;
      }) =>
      () => {
        const injectedAttributes = injectFilters({ filters, query });
        if (injectedAttributes) {
          navigateToPrefilledEditor(
            {
              id: '',
              timeRange,
              attributes: injectedAttributes,
              searchSessionId,
            },
            {
              openInNewTab: true,
            }
          );
        }
      },
    [injectFilters, navigateToPrefilledEditor]
  );

  const getExtraActions = useCallback(
    ({
      timeRange,
      filters = [],
      query = { language: 'kuery', query: '' },
      searchSessionId,
    }: {
      timeRange: TimeRange;
      filters?: Filter[];
      query?: Query;
      searchSessionId?: string;
    }) => {
      const openInLens = getOpenInLensAction(
        openInLensAction({ timeRange, filters, query, searchSessionId })
      );
      return [openInLens];
    },
    [openInLensAction]
  );

  const getFormula = () => {
    // const firstDataLayer = [
    //   ...('layers' in params
    //     ? Array.isArray(params.layers)
    //       ? params.layers
    //       : [params.layers]
    //     : [params.value]),
    // ].find((p) => p. === 'data');

    // if (!firstDataLayer) {
    //   return '';
    // }

    // const mainFormulaConfig = Array.isArray(firstDataLayer.data)
    //   ? firstDataLayer.data[0]
    //   : firstDataLayer.data;

    return 'formula';
  };

  return { formula: getFormula(), attributes, getExtraActions, error };
};

const getOpenInLensAction = (onExecute: () => void): Action => {
  return {
    id: 'openInLens',
    getDisplayName(_context: ActionExecutionContext): string {
      return i18n.translate('xpack.infra.hostsViewPage.tabs.metricsCharts.actions.openInLines', {
        defaultMessage: 'Open in Lens',
      });
    },
    getIconType(_context: ActionExecutionContext): string | undefined {
      return 'visArea';
    },
    type: 'actionButton',
    async isCompatible(_context: ActionExecutionContext): Promise<boolean> {
      return true;
    },
    async execute(_context: ActionExecutionContext): Promise<void> {
      onExecute();
    },
    order: 100,
  };
};
