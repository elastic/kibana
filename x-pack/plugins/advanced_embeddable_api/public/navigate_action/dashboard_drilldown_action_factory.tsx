/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import {} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { DashboardDrilldownAction } from './dashboard_drilldown_action';
import { DashboardDrilldownEditor } from './dashboard_drilldown_editor';
import { ActionFactory, ActionSavedObject } from '../dynamic_actions';
export const DASHBOARD_DRILLDOWN_ACTION = 'DASHBOARD_DRILLDOWN_ACTION';

export class DashboardDrilldownActionFactory extends ActionFactory {
  constructor() {
    super({ id: DASHBOARD_DRILLDOWN_ACTION, title: 'Drill down to a dashboard' });
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public async renderEditor(
    domNode: React.ReactNode,
    config: string,
    onChange: (config: string) => void
  ) {
    ReactDOM.render(
      // @ts-ignore
      <DashboardDrilldownEditor config={config} onChange={onChange} />,
      domNode
    );
  }

  public showParameterization() {
    return false;
  }

  public createNew() {
    return Promise.resolve(new DashboardDrilldownAction());
  }

  public fromSavedObject(actionSavedObject: ActionSavedObject) {
    return new DashboardDrilldownAction(actionSavedObject);
  }
}
