/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { set } from 'lodash';
import moment from 'moment';
import rison from 'rison-node';
import { ContextMenuAction, ContextMenuActionsRegistryProvider, Embeddable } from 'ui/embeddable';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { StateProvider } from 'ui/state_management/state';
import { jobCompletionNotifications } from '../lib/job_completion_notifications';

class GetReportPanelAction extends ContextMenuAction {
  private state: any;
  constructor(state: any) {
    super(
      {
        displayName: i18n.translate('kbn.dashboard.panel.reportPanel.displayName', {
          defaultMessage: 'PNG Report',
        }),
        id: 'openReport',
        parentPanelId: 'mainMenu',
      },
      {
        icon: 'document',
      }
    );
    this.state = state;
  }
  public isVisible({ embeddable }: { embeddable: Embeddable }): boolean {
    if (!embeddable) {
      return false;
    }
    if (!embeddable.savedVisualization.id) {
      return false;
    }
    return true;
  }

  public async onClick({
    embeddable,
    closeContextMenu,
  }: {
    embeddable: Embeddable;
    closeContextMenu: any;
  }) {
    if (!embeddable) {
      return;
    }
    if (!embeddable.savedVisualization.id) {
      return;
    }

    closeContextMenu();

    // Remove panels state since this report is for only one visualization panel
    set(this.state, 'panels', true);

    // Adds UI state for modified colors and other customizations
    set(this.state, 'uiState', embeddable.customization);

    const fromtime = moment.isMoment(embeddable.timeRange.from)
      ? embeddable.timeRange.from.toISOString()
      : embeddable.timeRange.from;
    const totime = moment.isMoment(embeddable.timeRange.to)
      ? embeddable.timeRange.to.toISOString()
      : embeddable.timeRange.to;

    let appquerystring = this.state.toQueryParam();

    // Colors have a # that is not handled correctly so we encode it here
    appquerystring = appquerystring.replace(new RegExp('#', 'g'), '%23');

    // mode of quick is hard coded and works ok even if time is relative or absolute and
    // refreshinterval is not used in the report
    const visualizationURL =
      `/app/kibana#/visualize/edit/${
        embeddable.savedVisualization.id
      }?_g=(refreshInterval:(pause:!f,value:900000),time:(from:'${fromtime}',mode:quick,to:'${totime}'))` +
      '&_a=' +
      appquerystring;

    const reportconfig = {
      browserTimezone: 'America/Phoenix',
      layout: {
        dimensions: {
          width: 960,
          height: 720,
        },
      },
      objectType: 'visualization',
      relativeUrl: visualizationURL,
      title: embeddable.savedVisualization.title,
    };

    const query = {
      jobParams: rison.encode(reportconfig),
    };

    const API_BASE_URL = '/api/reporting/generate';

    toastNotifications.addSuccess({
      title: `Queued report for ${reportconfig.objectType}`,
      text: 'Track its progress in Management',
      'data-test-subj': 'queueReportSuccess',
    });

    const resp = await kfetch({ method: 'POST', pathname: `${API_BASE_URL}/png`, query });

    jobCompletionNotifications.add(resp.job.id);
  }
}
export function createReportActionProvider(Private: any) {
  const State = Private(StateProvider);
  const state = new State('_a');
  return new GetReportPanelAction(state);
}
ContextMenuActionsRegistryProvider.register(createReportActionProvider);
