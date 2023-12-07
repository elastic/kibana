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
import { CoreProviders } from '../../apps/common_providers';
import { InfraClientStartDeps, InfraClientStartExports } from '../../types';
import { LazyAssetDetailsWrapper } from './lazy_asset_details_wrapper';
import type { AssetDetailsProps } from './types';

export const ASSET_DETAILS_EMBEDDABLE = 'ASSET_DETAILS_EMBEDDABLE';

export interface AssetDetailsEmbeddableInput extends EmbeddableInput, AssetDetailsProps {}

export class AssetDetailsEmbeddable extends Embeddable<AssetDetailsEmbeddableInput> {
  public readonly type = ASSET_DETAILS_EMBEDDABLE;
  private node?: HTMLElement;
  private subscription: Subscription;

  constructor(
    private core: CoreStart,
    private pluginDeps: InfraClientStartDeps,
    private pluginStart: InfraClientStartExports,
    initialInput: AssetDetailsEmbeddableInput,
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
            <LazyAssetDetailsWrapper
              assetId={this.input.assetId}
              assetName={this.input.assetName}
              assetType={this.input.assetType}
              dateRange={this.input.dateRange}
              overrides={this.input.overrides}
              renderMode={this.input.renderMode}
              tabs={this.input.tabs}
              links={this.input.links}
              metricAlias={this.input.metricAlias}
            />
          </div>
        </EuiThemeProvider>
      </CoreProviders>,
      this.node
    );
  }
}
