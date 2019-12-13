/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchCollector, SearchCollectorFactory } from '../../../../src/plugins/data/public';
import { AdvancedSearchCollector } from '../../advanced_data/public';
import {
  DashboardContainer,
  DashboardContainerInput,
  DASHBOARD_CONTAINER_TYPE,
} from '../../../../src/plugins/dashboard_embeddable_container/public';
import { DashboardContainerOptions } from '../../../../src/plugins/dashboard_embeddable_container/public/embeddable/dashboard_container';
import {
  EmbeddableHandlers,
  IContainer,
  ErrorEmbeddable,
  ViewMode,
} from '../../../../src/plugins/embeddable/public';

export class AdvancedDashboardContainer extends DashboardContainer {
  constructor(
    initialInput: DashboardContainerInput,
    options: DashboardContainerOptions & { searchCollector: AdvancedSearchCollector },
    handlers: EmbeddableHandlers
  ) {
    super(initialInput, options, { ...handlers, searchCollector: options.searchCollector });
    this.searchCollector = options.searchCollector;

    // Don't allow "send to background" if this dashboard is already using cached searches from
    // a background collection.
    if (!initialInput.bgSearchId) {
      (this.searchCollector as AdvancedSearchCollector).backgroundSearchUrlBuilder = (
        id: string
      ) => {
        return {
          name: this.input.title,
          url: JSON.stringify({
            type: DASHBOARD_CONTAINER_TYPE,
            input: { ...this.input, bgSearchId: id, viewMode: ViewMode.VIEW },
          }),
          onComplete: () => {
            window.location.href = `http://localhost:5701/app/kibana#/dashboards`;
          },
        };
      };
    }
  }

  public onInputChanged(newInput: DashboardContainerInput) {
    // This logic is likely wrong, but if we use the same dashboard URL, we have to kick the url off the
    // bg searches so navigating away, or deleting a panel, won't cause the background search to get
    // cancelled.  If we use a dedicated URL where we can more easily lock down editing capabilities,
    // I think we might be able to avoid this entirely.
    if (this.input.bgSearchId) {
      (this.searchCollector as AdvancedSearchCollector).clearCache();
    }
    super.onInputChanged(newInput);
  }

  public destroy() {
    super.destroy();
    this.searchCollector!.destroy();
  }
}
