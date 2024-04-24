/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ProjectSwitcher, ProjectSwitcherKibanaProvider } from '@kbn/serverless-project-switcher';
import { ProjectType } from '@kbn/serverless-types';
import React from 'react';
import ReactDOM from 'react-dom';
import { API_SWITCH_PROJECT as projectChangeAPIUrl } from '../common';
import { ServerlessConfig } from './config';
import {
  generateManageOrgMembersNavCard,
  manageOrgMembersNavCardName,
  SideNavComponent,
} from './navigation';
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

    if (developer && developer.projectSwitcher && developer.projectSwitcher.enabled) {
      const { currentType } = developer.projectSwitcher;

      core.chrome.navControls.registerRight({
        order: 500,
        mount: (target) => this.mountProjectSwitcher(target, core, currentType),
      });
    }

    core.chrome.setChromeStyle('project');

    // Casting the "chrome.projects" service to an "internal" type: this is intentional to obscure the property from Typescript.
    const { project } = core.chrome as InternalChromeStart;
    const { cloud } = dependencies;

    if (cloud.serverless.projectName) {
      project.setProjectName(cloud.serverless.projectName);
    }
    project.setCloudUrls(cloud);

    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

    core.chrome.navControls.registerRight({
      order: 1,
      mount: toMountPoint(
        <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
          <EuiButton
            href="https://ela.st/serverless-feedback"
            size={'s'}
            color={'warning'}
            iconType={'popout'}
            iconSide={'right'}
            target={'_blank'}
          >
            {i18n.translate('xpack.serverless.header.giveFeedbackBtn.label', {
              defaultMessage: 'Give feedback',
            })}
          </EuiButton>
        </KibanaRenderContextProvider>,
        { ...core }
      ),
    });

    return {
      setSideNavComponentDeprecated: (sideNavigationComponent) =>
        project.setSideNavComponent(sideNavigationComponent),
      initNavigation: (id, navigationTree$, { panelContentProvider, dataTestSubj } = {}) => {
        project.initNavigation(id, navigationTree$);
        project.setSideNavComponent(() => (
          <SideNavComponent
            navProps={{
              navigationTree$: navigationTreeUi$,
              dataTestSubj,
              panelContentProvider,
            }}
            deps={{
              core,
              activeNodes$: activeNavigationNodes$,
            }}
          />
        ));
      },
      setBreadcrumbs: (breadcrumbs, params) => project.setBreadcrumbs(breadcrumbs, params),
      setProjectHome: (homeHref: string) => project.setHome(homeHref),
      getNavigationCards: (roleManagementEnabled, extendCardNavDefinitions) => {
        if (!roleManagementEnabled) return extendCardNavDefinitions;

        const manageOrgMembersNavCard = generateManageOrgMembersNavCard(cloud.organizationUrl);
        if (extendCardNavDefinitions) {
          extendCardNavDefinitions[manageOrgMembersNavCardName] = manageOrgMembersNavCard;
          return extendCardNavDefinitions;
        }
        return { [manageOrgMembersNavCardName]: manageOrgMembersNavCard };
      },
    };
  }

  public stop() {}

  private mountProjectSwitcher(
    targetDomElement: HTMLElement,
    coreStart: CoreStart,
    currentProjectType: ProjectType
  ) {
    ReactDOM.render(
      <KibanaRenderContextProvider i18n={coreStart.i18n} theme={coreStart.theme}>
        <ProjectSwitcherKibanaProvider {...{ coreStart, projectChangeAPIUrl }}>
          <ProjectSwitcher {...{ currentProjectType }} />
        </ProjectSwitcherKibanaProvider>
      </KibanaRenderContextProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
