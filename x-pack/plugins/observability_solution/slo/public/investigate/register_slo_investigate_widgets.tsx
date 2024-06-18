/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreSetup } from '@kbn/core/public';
import useAsync from 'react-use/lib/useAsync';
import { lazy } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ChromeOption } from '@kbn/investigate-plugin/public';
import type { RegisterWidget } from '@kbn/investigate-plugin/public/types';
import type { SloPublicPluginsSetup, SloPublicPluginsStart } from '..';
import { SLO_DETAIL_WIDGET_NAME, SLO_INVENTORY_WIDGET_NAME } from './constants';
import { SloEmbeddableContext } from '../embeddable/slo/common/slo_embeddable_context';

interface RegisterInvestigateWidgetOptions {
  coreSetup: CoreSetup<SloPublicPluginsStart>;
  pluginsSetup: SloPublicPluginsSetup;
  kibanaVersion: string;
  registerWidget: RegisterWidget;
}

const LazyInvestigateSloInventory = withSuspense(
  lazy(() =>
    import('./investigate_slo_inventory').then((m) => ({
      default: m.InvestigateSloInventory,
    }))
  )
);

const LazyInvestigateSloDetail = withSuspense(
  lazy(() =>
    import('./investigate_slo_detail').then((m) => ({
      default: m.InvestigateSloDetail,
    }))
  )
);

export function registerSloInvestigateWidgets(options: RegisterInvestigateWidgetOptions) {
  function WithContext({ children }: { children: React.ReactNode }) {
    const startServicesAsync = useAsync(async () => {
      return await options.coreSetup.getStartServices();
    }, []);

    const [coreStart, pluginsStart] = startServicesAsync.value ?? [undefined, undefined];

    if (!coreStart || !pluginsStart) {
      return null;
    }

    return (
      <SloEmbeddableContext
        coreStart={coreStart}
        pluginsStart={pluginsStart}
        kibanaVersion={options.kibanaVersion}
      >
        {children}
      </SloEmbeddableContext>
    );
  }

  options.registerWidget(
    {
      type: SLO_INVENTORY_WIDGET_NAME,
      description: 'Show a grid of SLOs, which displays their state, and the history of the SLI',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {},
      },
    },
    async () => {
      return {};
    },
    ({ widget, onWidgetAdd }) => {
      const { timeRange, filters, query } = widget.parameters;
      return (
        <WithContext>
          <LazyInvestigateSloInventory
            timeRange={timeRange}
            filters={filters}
            query={query}
            onWidgetAdd={onWidgetAdd}
          />
        </WithContext>
      );
    }
  );

  options.registerWidget(
    {
      type: SLO_DETAIL_WIDGET_NAME,
      description:
        'Show an overview of a single SLO, including its metadata, the historical SLI, the budget burn down, and the good vs bad events',
      chrome: ChromeOption.static,
      schema: {
        type: 'object',
        properties: {
          sloId: {
            type: 'string',
            description: 'The ID of the SLO displayed',
          },
          remoteName: {
            type: 'string',
            description: 'The name of the remote for the SLO',
          },
        },
        required: ['sloId'],
      },
    } as const,
    async () => {
      return {};
    },
    ({ widget, blocks, onWidgetAdd }) => {
      const { timeRange, filters, query, sloId, remoteName } = widget.parameters;
      return (
        <WithContext>
          <LazyInvestigateSloDetail
            timeRange={timeRange}
            filters={filters}
            query={query}
            sloId={sloId}
            remoteName={remoteName}
            blocks={blocks}
            onWidgetAdd={onWidgetAdd}
          />
        </WithContext>
      );
    }
  );
}
