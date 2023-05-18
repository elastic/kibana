/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ProjectSwitcher, ProjectSwitcherKibanaProvider } from '@kbn/serverless-project-switcher';
import { ProjectType } from '@kbn/serverless-types';
import React from 'react';
import ReactDOM from 'react-dom';
import { API_SWITCH_PROJECT as projectChangeAPIUrl } from '../common';
import { ServerlessConfig } from './config';
import {
  ServerlessPluginSetup,
  ServerlessPluginSetupDependencies,
  ServerlessPluginStart,
  ServerlessPluginStartDependencies,
} from './types';

export class ServerlessPlugin
  implements
    Plugin<
      ServerlessPluginSetup,
      ServerlessPluginStart,
      ServerlessPluginSetupDependencies,
      ServerlessPluginStartDependencies
    >
{
  private readonly config: ServerlessConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessConfig>();
  }

  public setup(
    _core: CoreSetup,
    _dependencies: ServerlessPluginSetupDependencies
  ): ServerlessPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    dependencies: ServerlessPluginStartDependencies
  ): ServerlessPluginStart {
    const { developer } = this.config;
    const { management } = dependencies;

    if (developer && developer.projectSwitcher && developer.projectSwitcher.enabled) {
      const { currentType } = developer.projectSwitcher;

      core.chrome.navControls.registerRight({
        mount: (target) => this.mountProjectSwitcher(target, core, currentType),
      });
    }

    core.chrome.setChromeStyle('project');
    management.setIsSidebarEnabled(false);

    return {
      setSideNavComponent: (sideNavigationComponent) =>
        // Casting the "chrome.projects" service to an "internal" type: this is intentional to obscure the property from Typescript.
        (core.chrome as InternalChromeStart).project.setSideNavComponent(sideNavigationComponent),
    };
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
