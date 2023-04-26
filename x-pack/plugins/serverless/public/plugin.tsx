/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ProjectSwitcher, ProjectSwitcherKibanaProvider } from '@kbn/serverless-project-switcher';
import { ProjectType } from '@kbn/serverless-types';

import { ServerlessPluginSetup, ServerlessPluginStart } from './types';
import { ServerlessConfig } from './config';
import { API_SWITCH_PROJECT as projectChangeAPIUrl } from '../common';

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  private readonly config: ServerlessConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessConfig>();
  }

  public setup(_core: CoreSetup): ServerlessPluginSetup {
    return {};
  }

  public start(core: CoreStart): ServerlessPluginStart {
    const { developer } = this.config;

    if (developer && developer.projectSwitcher && developer.projectSwitcher.enabled) {
      const { currentType } = developer.projectSwitcher;

      core.chrome.navControls.registerRight({
        mount: (target) => this.mountProjectSwitcher(target, core, currentType),
      });
    }

    core.chrome.setChromeStyle('project');

    return {};
  }

  public stop() {}

  private mountProjectSwitcher(
    targetDomElement: HTMLElement,
    coreStart: CoreStart,
    currentProjectType: ProjectType
  ) {
    ReactDOM.render(
      <KibanaThemeProvider theme$={coreStart.theme.theme$}>
        <ProjectSwitcherKibanaProvider {...{ coreStart, projectChangeAPIUrl }}>
          <ProjectSwitcher {...{ currentProjectType }} />
        </ProjectSwitcherKibanaProvider>
      </KibanaThemeProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
