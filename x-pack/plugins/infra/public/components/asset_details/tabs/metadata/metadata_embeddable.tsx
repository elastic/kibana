/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { Embeddable, EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { CoreProviders } from '../../../../apps/common_providers';
import { InfraClientStartDeps, InfraClientStartExports } from '../../../../types';
import { LazyMetadataWrapper } from './lazy_metadata_wrapper';
import type { MetadataProps } from './metadata';

export const METADATA_EMBEDDABLE = 'METADATA_EMBEDDABLE';

export interface MetadataEmbeddableInput extends EmbeddableInput, MetadataProps {}

export class MetadataEmbeddable extends Embeddable<MetadataEmbeddableInput> {
  public readonly type = METADATA_EMBEDDABLE;
  private node?: HTMLElement;
  private subscription: Subscription;

  constructor(
    private core: CoreStart,
    private pluginDeps: InfraClientStartDeps,
    private pluginStart: InfraClientStartExports,
    initialInput: MetadataEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.subscription = this.getInput$().subscribe(() => this.renderComponent());
  }

  public render(node: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = node;

    this.renderComponent();
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public async reload() {}

  private renderComponent() {
    if (!this.node) {
      return;
    }

    ReactDOM.render(
      <CoreProviders
        core={this.core}
        plugins={this.pluginDeps}
        pluginStart={this.pluginStart}
        theme$={this.core.theme.theme$}
      >
        <EuiThemeProvider>
          <div style={{ width: '100%' }}>
            <LazyMetadataWrapper
              currentTimeRange={this.input.currentTimeRange}
              node={this.input.node}
              nodeType={this.input.nodeType}
              showActionsColumn={this.input.showActionsColumn}
              onSearchChange={this.input.onSearchChange}
              search={this.input.search}
            />
          </div>
        </EuiThemeProvider>
      </CoreProviders>,
      this.node
    );
  }
}
