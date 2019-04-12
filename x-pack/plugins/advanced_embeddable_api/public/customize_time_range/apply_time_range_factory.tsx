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
import {} from '../../../../../src/legacy/core_plugins/embeddable_api/public';
import { ApplyTimeRangeAction } from './apply_time_range';
import { ActionFactory, ActionSavedObject } from '../dynamic_actions';
import { SerializedDynamicAction } from '../dynamic_actions/action_saved_object';
export const APPLY_TIME_RANGE = 'APPLY_TIME_RANGE';

export class ApplyTimeRangeActionFactory extends ActionFactory {
  constructor() {
    super({ id: APPLY_TIME_RANGE, title: 'Apply custom time range' });
  }

  public isCompatible() {
    return Promise.resolve(true);
  }

  public async renderEditor(domNode: React.ReactNode) {
    // @ts-ignore
    ReactDOM.render(<div />, domNode);
  }

  public create(serializedAction: SerializedDynamicAction) {
    return new ApplyTimeRangeAction(serializedAction);
  }

  public createNew() {
    return Promise.resolve(new ApplyTimeRangeAction());
  }
}
