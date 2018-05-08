/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DashboardPanelAction,
  DashboardPanelActionsRegistryProvider
} from 'ui/dashboard_panel_actions';

class CreateJobPanelAction extends DashboardPanelAction {
  constructor() {
    super({
      parentPanelId: 'mainMenu',
      displayName: 'Create ML job'
    });
  }

  /**
   * @param {Embeddable} embeddable
   * @param containerState
   */
  async onClick({ embeddable }) {
    const query = await embeddable.getEsQuery();
    alert(`Create a job with query ${JSON.stringify(query)}`);
  }

  /**
   * Defaults to always visible.
   * @param {Embeddable} embeddable
   * @param containerState
   * @return {boolean}
   */
  isVisible(/*embeddable, containerState*/) {
    return true;
  }

  /**
   * Defaults to always enabled.
   * @param {Embeddable} embeddable
   * @param containerState
   */
  isDisabled(/*embeddable, containerState */) {
    return false;
  }
}

export function createJobActionProvider(Private) {
  const CreateJobPanelActionProvider = () => {
    return new CreateJobPanelAction();
  };
  return Private(CreateJobPanelActionProvider);
}

DashboardPanelActionsRegistryProvider.register(createJobActionProvider);
