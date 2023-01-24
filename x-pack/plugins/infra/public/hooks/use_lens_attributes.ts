/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormulaPublicApi } from '@kbn/lens-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { InfraClientSetupDeps, LensAttributes, LensOptions } from '../types';
import {
  buildLensAttributes,
  HostLensAttributesTypes,
  hostMetricsLensAttributes,
} from '../common/visualizations';

interface UseLensAttributesParams {
  type: HostLensAttributesTypes;
  dataView: DataView | undefined;
  options?: LensOptions;
}

export const useLensAttributes = ({
  type,
  dataView,
  options = {
    breakdownSize: 10,
  },
}: UseLensAttributesParams) => {
  const {
    services: { lens },
  } = useKibana<InfraClientSetupDeps>();
  const { navigateToPrefilledEditor } = lens;
  const [formulaAPI, setFormulaAPI] = useState<FormulaPublicApi>();

  useEffect(() => {
    const getFormulaApi = async () => {
      const { formula } = await lens.stateHelperApi();
      return setFormulaAPI(formula);
    };
    getFormulaApi();
  }, [lens]);

  const attributes: LensAttributes | null = useMemo(() => {
    if (!dataView || !formulaAPI) {
      return null;
    }

    const VisualizationClass = hostMetricsLensAttributes[type];
    const visualizationAttributes = buildLensAttributes(
      new VisualizationClass(dataView, options, formulaAPI)
    );

    return visualizationAttributes;
  }, [dataView, formulaAPI, options, type]);

  const injectData = (data: {
    filters: Filter[];
    query: Query;
    title?: string;
  }): LensAttributes | null => {
    if (!attributes) {
      return null;
    }

    return {
      ...attributes,
      ...(!!data.title ? { title: data.title } : {}),
      state: {
        ...attributes.state,
        query: data.query,
        filters: [...attributes.state.filters, ...data.filters],
      },
    };
  };

  const getExtraActions = (currentAttributes: LensAttributes | null, timeRange: TimeRange) => {
    return {
      openInLens: {
        id: 'openInLens',

        getDisplayName(_context: ActionExecutionContext): string {
          return i18n.translate('xpack.infra.hostsTable.tabs.metricsCharts.acitons.openInLines', {
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
          if (currentAttributes) {
            navigateToPrefilledEditor(
              {
                id: '',
                timeRange,
                attributes: currentAttributes,
              },
              {
                openInNewTab: true,
              }
            );
          }
        },
        order: 100,
      },
    };
  };

  return { attributes, injectData, getExtraActions };
};
