/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';
import { OutPortal } from 'react-reverse-portal';

import type { DocLinksStart } from '@kbn/core/public';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SettingFlyoutFooterPortal } from '@kbn/management-settings-components-form/form';
import type { SectionRegistryStart } from '@kbn/management-settings-section-registry';
import { withSuspense } from '@kbn/shared-ux-utility';

const LazyKibanaSettingsApplication = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-application')).KibanaSettingsApplication,
}));

const KibanaSettingsApplication = withSuspense(LazyKibanaSettingsApplication);

export const SettingsFlyout = ({ onClose }: { onClose: () => void }) => {
  const kibana = useKibana<
    {
      advancedSettings: SectionRegistryStart;
      chrome: Pick<ChromeStart, 'setBadge'>;
      i18n: I18nStart;
      docLinks: DocLinksStart;
    } & CoreSetup
  >();
  const closeFlyout = () => {
    onClose();
  };

  if (!kibana.services.advancedSettings) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={closeFlyout} size="l" id="settingsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Settings</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <KibanaSettingsApplication
          {...kibana.services}
          sectionRegistry={kibana.services.advancedSettings!}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <OutPortal node={SettingFlyoutFooterPortal} />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
