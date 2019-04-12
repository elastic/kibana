/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
// @ts-ignore
import { interpretAst } from 'plugins/interpreter/interpreter';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  DashboardContainer,
  DashboardEmbeddable,
} from '../../../../../src/legacy/core_plugins/dashboard_embeddable/public';
import {
  ActionFactory,
  ActionSavedObject,
  addAction,
} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ExpressionAction } from './expression_action';
import { ExpressionActionEditor } from './expression_action_editor';

export const EXPRESSION_ACTION = 'EXPRESSION_ACTION';

export class ExpressionActionFactory extends ActionFactory {
  constructor() {
    super({ id: EXPRESSION_ACTION, title: 'Custom Expression Action' });
  }

  public isCompatible({
    embeddable,
    container,
  }: {
    embeddable: DashboardEmbeddable;
    container: DashboardContainer;
  }) {
    return Promise.resolve(true);
  }

  public async renderEditor(
    domNode: React.ReactNode,
    config: string,
    onChange: (config: string) => void
  ) {
    ReactDOM.render(
      // @ts-ignore
      <ExpressionActionEditor config={config} onChange={onChange} />,
      domNode
    );
  }

  public create(actionSavedObject: ActionSavedObject): ExpressionAction {
    return new ExpressionAction(actionSavedObject);
  }

  public createNew() {
    return new ExpressionAction();
  }
}
