/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContainer, ErrorEmbeddable } from 'src/plugins/embeddable/public';
import { SavedObjectsClient } from 'kibana/public';
import { AdvancedSearchCollector, getBgSearchCollection } from '../../advanced_data/public';
import {
  DashboardContainerFactory,
  DashboardOptions,
  DashboardContainerInput,
  DashboardContainer,
  DASHBOARD_CONTAINER_TYPE,
} from '../../../../src/plugins/dashboard_embeddable_container/public';
import { AdvancedDashboardContainer } from './advanced_dashboard_container';

export class AdvancedDashboardFactory extends DashboardContainerFactory {
  constructor(options: DashboardOptions, private client: SavedObjectsClient) {
    super(options);
  }

  async create(
    initialInput: DashboardContainerInput,
    parent?: IContainer
  ): Promise<DashboardContainer | ErrorEmbeddable> {
    let searchCollector: AdvancedSearchCollector;
    if (!parent && this.createSearchCollector) {
      searchCollector = (await this.createSearchCollector(
        initialInput.bgSearchId || initialInput.id
      )) as AdvancedSearchCollector;

      // if (initialInput.bgSearchId) {
      //   const bgSearch = await getBgSearchCollection(this.client, initialInput.bgSearchId);
      //   searchCollector.loadSearchCollection(bgSearch.attributes);
      // }
    }

    const dashboard = new AdvancedDashboardContainer(
      initialInput,
      { ...this.options, searchCollector },
      {
        createSearchCollector: this.createSearchCollector!,
        parent,
      }
    );
    return dashboard;
  }
}
