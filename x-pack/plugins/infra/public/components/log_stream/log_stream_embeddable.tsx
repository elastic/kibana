/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Query, TimeRange } from '../../../../../../src/plugins/data/public';
import {
  Embeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import { CoreProviders } from '../../apps/common_providers';
import { InfraClientStartDeps } from '../../types';
import { datemathToEpochMillis } from '../../utils/datemath';
import { LazyLogStreamWrapper } from './lazy_log_stream_wrapper';

export const LOG_STREAM_EMBEDDABLE = 'LOG_STREAM_EMBEDDABLE';

export interface LogStreamEmbeddableInput extends EmbeddableInput {
  timeRange: TimeRange;
  query: Query;
}

export class LogStreamEmbeddable extends Embeddable<LogStreamEmbeddableInput> {
  public readonly type = LOG_STREAM_EMBEDDABLE;
  private node?: HTMLElement;

  constructor(
    private core: CoreStart,
    private pluginDeps: InfraClientStartDeps,
    initialInput: LogStreamEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    this.renderComponent();
  }

  public reload() {
    this.renderComponent();
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  private renderComponent() {
    if (!this.node) {
      return;
    }

    const startTimestamp = datemathToEpochMillis(this.input.timeRange.from);
    const endTimestamp = datemathToEpochMillis(this.input.timeRange.to);

    if (!startTimestamp || !endTimestamp) {
      return;
    }

    ReactDOM.render(
      <CoreProviders core={this.core} plugins={this.pluginDeps}>
        <EuiThemeProvider>
          <div style={{ width: '100%' }}>
            <LazyLogStreamWrapper
              startTimestamp={startTimestamp}
              endTimestamp={endTimestamp}
              height="100%"
              query={this.input.query}
            />
          </div>
        </EuiThemeProvider>
      </CoreProviders>,
      this.node
    );
  }
}
