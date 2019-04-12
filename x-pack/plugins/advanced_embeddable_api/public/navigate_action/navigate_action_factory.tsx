/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { ActionFactory, ActionSavedObject, addAction } from '../dynamic_actions';
// @ts-ignore
import { interpretAst } from '../../../interpreter/public/interpreter';
import { NavigateAction } from './navigate_action';
import { NavigateActionEditor } from './navigate_action_editor';
import { SerializedDynamicAction } from '../dynamic_actions/action_saved_object';

export const NAVIGATE_ACTION_TYPE = 'navigateActionType';

export class NavigateActionFactory extends ActionFactory {
  constructor() {
    super({ id: NAVIGATE_ACTION_TYPE, title: 'Custom Navigation Action' });
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
      <NavigateActionEditor config={config} onChange={onChange} />,
      domNode
    );
  }

  public createNew() {
    return Promise.resolve(new NavigateAction());
  }

  public create(actionSavedObject: SerializedDynamicAction) {
    return new NavigateAction(actionSavedObject);
  }
}
