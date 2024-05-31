/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query, Filter } from '@kbn/es-query';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import React, { FC, PropsWithChildren } from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import { Embeddable, EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { InfraClientStartDeps, InfraClientStartExports } from '../../types';
import { datemathToEpochMillis } from '../../utils/datemath';
import { useKibanaContextForPluginProvider } from '../../hooks/use_kibana';

export const LOG_STREAM_EMBEDDABLE = 'LOG_STREAM_EMBEDDABLE';

export interface LogStreamEmbeddableInput extends EmbeddableInput {
  filters: Filter[];
  timeRange: TimeRange;
  query: Query;
}

export class LogStreamEmbeddable extends Embeddable<LogStreamEmbeddableInput> {
  public readonly type = LOG_STREAM_EMBEDDABLE;
  private node?: HTMLElement;
  private subscription: Subscription;
  private isDarkMode = false;

  constructor(
    private core: CoreStart,
    private pluginDeps: InfraClientStartDeps,
    private pluginStart: InfraClientStartExports,
    initialInput: LogStreamEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.subscription = new Subscription();

    this.subscription.add(
      core.theme?.theme$.subscribe((theme) => (this.isDarkMode = theme.darkMode))
    );

    this.subscription.add(this.getInput$().subscribe(() => this.renderComponent()));
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

    const startTimestamp = datemathToEpochMillis(this.input.timeRange.from);
    const endTimestamp = datemathToEpochMillis(this.input.timeRange.to, 'up');

    if (!startTimestamp || !endTimestamp) {
      return;
    }

    ReactDOM.render(
      <LogStreamEmbeddableProviders
        core={this.core}
        plugins={this.pluginDeps}
        pluginStart={this.pluginStart}
        theme$={this.core.theme.theme$}
      >
        <EuiThemeProvider darkMode={this.isDarkMode}>
          <div style={{ width: '100%' }}>
            <LogStream
              logView={{ type: 'log-view-reference', logViewId: 'default' }}
              startTimestamp={startTimestamp}
              endTimestamp={endTimestamp}
              height="100%"
              query={this.input.query}
              filters={this.input.filters}
            />
          </div>
        </EuiThemeProvider>
      </LogStreamEmbeddableProviders>,
      this.node
    );
  }
}

export interface LogStreamEmbeddableProvidersProps {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
}

export const LogStreamEmbeddableProviders: FC<
  PropsWithChildren<LogStreamEmbeddableProvidersProps>
> = ({ children, core, pluginStart, plugins }) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
        {children}
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
