/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { Plugin, CoreSetup } from 'src/core/public';

import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge } from '@elastic/eui';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { ILicense } from '../../licensing/common/types';

import { PLUGIN } from '../common';
import { PluginDependencies } from './types';

const checkLicenseStatus = (license: ILicense) => {
  const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
  return state === 'valid' ? { valid: true } : { valid: false, message };
};

export class EcsMapperUIPlugin implements Plugin<void, void, PluginDependencies> {
  public setup(
    { http, getStartServices }: CoreSetup,
    { devTools, home, licensing }: PluginDependencies
  ) {
    home.featureCatalogue.register({
      id: PLUGIN.id,
      title: i18n.translate('xpack.ecsMapper.registryProviderTitle', {
        defaultMessage: 'ECS Mapper (beta)',
      }),
      description: i18n.translate('xpack.ecsMapper.registryProviderDescription', {
        defaultMessage: 'Beta',
      }),
      icon: 'empty',
      path: '/app/dev_tools#/ecs_mapper',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN,
    });

    const devTool = devTools.register({
      id: 'ecs_mapper',
      title: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.ecsMapper.displayName', {
              defaultMessage: 'ECS Mapper',
            })}
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="ecsMapper__betaLabelContainer">
            <EuiBetaBadge
              label={i18n.translate('xpack.ecsMapper.displayNameBetaLabel', {
                defaultMessage: 'Beta',
              })}
              tooltipContent={i18n.translate('xpack.ecsMapper.displayNameBetaTooltipText', {
                defaultMessage: 'This feature might change drastically in future releases',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) as any,
      order: 8,
      enableRouting: false,
      mount: async (params) => {
        const [coreStart] = await getStartServices();
        const { notifications, i18n: i18nDep } = coreStart;
        const { renderApp } = await import('./application');

        const license = await licensing.license$.pipe(first()).toPromise();
        const initialLicenseStatus = checkLicenseStatus(license);

        return renderApp({
          http,
          initialLicenseStatus,
          el: params.element,
          I18nContext: i18nDep.Context,
          notifications: notifications.toasts,
        });
      },
    });

    licensing.license$.subscribe((license) => {
      if (!checkLicenseStatus(license).valid && !devTool.isDisabled()) {
        devTool.disable();
      } else if (devTool.isDisabled()) {
        devTool.enable();
      }
    });
  }

  public start() {}

  public stop() {}
}
