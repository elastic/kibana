/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import rison from 'rison-node';
import {
  ContainerState,
  ContextMenuAction,
  ContextMenuActionsRegistryProvider,
  Embeddable,
} from 'ui/embeddable';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { VisualizeEmbeddable } from '../../../../../src/core_plugins/kibana/public/visualize/embeddable/visualize_embeddable';
import { jobCompletionNotifications } from '../lib/job_completion_notifications';

class GetPngReportPanelAction extends ContextMenuAction {
  constructor() {
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
  }
  public isVisible({ embeddable }: { embeddable: Embeddable }): boolean {
    if (!embeddable) {
      return false;
    }
    if (!(embeddable instanceof VisualizeEmbeddable)) {
      return false;
    }
    return true;
  }

  public async onClick({
    embeddable,
    containerState,
    closeContextMenu,
  }: {
    embeddable: Embeddable;
    closeContextMenu: any;
    containerState: ContainerState;
  }) {
    if (!embeddable) {
      return;
    }
    if (!(embeddable instanceof VisualizeEmbeddable)) {
      return;
    }
    const visualizeEmbeddable = embeddable as VisualizeEmbeddable;

    if (!visualizeEmbeddable.savedVisualization.id) {
      return;
    }

    closeContextMenu();

    const visualizationURL = visualizeEmbeddable.generateAccessLink(containerState);

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
      title: visualizeEmbeddable.getPanelTitle(containerState),
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

ContextMenuActionsRegistryProvider.register(() => new GetPngReportPanelAction());
