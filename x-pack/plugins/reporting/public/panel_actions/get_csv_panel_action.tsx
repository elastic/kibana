/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { SearchEmbeddable } from 'src/legacy/core_plugins/kibana/public/discover/embeddable/search_embeddable';
import { ContextMenuAction, ContextMenuActionsRegistryProvider } from 'ui/embeddable';
import { PanelActionAPI } from 'ui/embeddable/context_menu_actions/types';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { jobCompletionNotifications } from '../lib/job_completion_notifications';

class GetCsvReportPanelAction extends ContextMenuAction {
  constructor() {
    super(
      {
        displayName: i18n.translate('kbn.dashboard.panel.reportPanel.displayName', {
          defaultMessage: 'Export to CSV',
        }),
        id: 'openReport',
        parentPanelId: 'mainMenu',
      },
      {
        icon: 'document',
      }
    );
  }

  public async generateJobParams({ searchEmbeddable }: { searchEmbeddable: any }) {
    // const adapters = searchEmbeddable.getInspectorAdapters();
    // if (!adapters) {
    //   return '';
    // }
    // if (adapters.requests.requests.length === 0) {
    //   return '';
    // }
    // const body = await searchEmbeddable.searchScope.searchSource.getSearchRequestBody();
    // const timeFieldName = searchEmbeddable.metadata.indexPattern.timeFieldName;
    // const fields = timeFieldName
    //   ? [timeFieldName, ...searchEmbeddable.savedSearch.columns]
    //   : searchEmbeddable.savedSearch.columns;
    // const jobParams = rison.encode({
    //   conflictedTypesFields: [],
    //   fields,
    //   indexPatternId: searchEmbeddable.metadata.indexPattern.id,
    //   metaFields: searchEmbeddable.metadata.indexPattern.metaFields,
    //   searchRequest: { body },
    //   title: searchEmbeddable.savedSearch.title,
    //   type: 'search',
    // });
    // return jobParams;
    return 'todo://do-this.com';
  }

  public isVisible = (panelActionAPI: PanelActionAPI): boolean => {
    const { embeddable } = panelActionAPI;

    if (!embeddable) {
      return false;
    }

    // Likely will have to change this check for TSVB
    if (!(embeddable instanceof SearchEmbeddable)) {
      return false;
    }

    return true;
  };

  // TODO: Move this to Tim's Dank API
  public onClick = async (panelActionAPI: PanelActionAPI) => {
    const { embeddable } = panelActionAPI;

    if (!embeddable) {
      return;
    }
    if (!(embeddable instanceof SearchEmbeddable)) {
      return;
    }
    const searchEmbeddable = embeddable as SearchEmbeddable;

    const jobParams = await this.generateJobParams({ searchEmbeddable });

    if (jobParams === '') {
      return;
    }
    const query = {
      jobParams,
    };

    const API_BASE_URL = '/api/reporting/generate';

    toastNotifications.addSuccess({
      title: `Queued report for CSV`,
      text: 'Track its progress in Management',
      'data-test-subj': 'queueReportSuccess',
    });

    const resp = await kfetch({ method: 'POST', pathname: `${API_BASE_URL}/csv`, query });

    jobCompletionNotifications.add(resp.job.id);
  };
}

ContextMenuActionsRegistryProvider.register(() => new GetCsvReportPanelAction());
