/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ShowSelectedFilters } from './show_selected_filters';
import { MonitorFilters } from './types';
import { EmbeddablePanelWrapper } from '../../synthetics/components/common/components/embeddable_panel_wrapper';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';
import { OverviewGrid } from '../../synthetics/components/monitors_page/overview/overview/overview_grid';

export const StatusGridComponent = ({
  reload$,
  filters,
}: {
  reload$: Subject<boolean>;
  filters: MonitorFilters;
}) => {
  return (
    <EmbeddablePanelWrapper
      title={i18n.translate(
        'xpack.synthetics.statusOverviewComponent.embeddablePanelWrapper.monitorsLabel',
        { defaultMessage: 'Monitors' }
      )}
      titleAppend={<ShowSelectedFilters filters={filters} />}
    >
      <SyntheticsEmbeddableContext reload$={reload$}>
        <OverviewGrid />
      </SyntheticsEmbeddableContext>
    </EmbeddablePanelWrapper>
  );
};
