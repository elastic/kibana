/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CoreSetup } from 'kibana/public';
import { first } from 'rxjs/operators';
import { ILicense } from '../../licensing/common/types';
import { EcsMapperSetupDependencies } from './plugin';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { PLUGIN } from '../common';

const checkLicenseStatus = (license: ILicense) => {
  const { state, message } = license.check(PLUGIN.id, PLUGIN.minimumLicenseType);
  return state === 'valid' ? { valid: true } : { valid: false, message };
};

export async function registerDevTool(plugins: EcsMapperSetupDependencies, core: CoreSetup) {
  const devTool = plugins.devTools.register({
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
      const [coreStart] = await core.getStartServices();
      const { i18n: i18nDep } = coreStart;
      const { renderApp } = await import('./application');

      const license = await plugins.licensing.license$.pipe(first()).toPromise();
      const initialLicenseStatus = checkLicenseStatus(license);

      return renderApp({
        initialLicenseStatus,
        el: params.element,
        I18nContext: i18nDep.Context,
      });
    },
  });

  plugins.licensing.license$.subscribe((license: ILicense) => {
    if (!checkLicenseStatus(license).valid && !devTool.isDisabled()) {
      devTool.disable();
    } else if (devTool.isDisabled()) {
      devTool.enable();
    }
  });
}

export function registerHomeFeatureCatalogue(home: HomePublicPluginSetup) {
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
    category: FeatureCatalogueCategory.DATA,
    order: 500,
  });
}
