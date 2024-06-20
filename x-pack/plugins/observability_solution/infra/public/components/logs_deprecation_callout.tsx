/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { AllDatasetsLocatorParams, ALL_DATASETS_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

export const LogsDeprecationCallout = () => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const locator = share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;

  const urlToLogsExplorer = locator.getRedirectUrl({});

  const navigateToLogsExplorer = () => {
    locator.navigate({});
  };

  const logsExplorerLinkProps = getRouterLinkProps({
    href: urlToLogsExplorer,
    onClick: navigateToLogsExplorer,
  });

  return (
    <EuiCallOut
      title={i18n.translate('xpack.infra.logsDeprecationCallout.euiCallOut.discoverANewLogLabel', {
        defaultMessage: 'Discover a new Logs Exploration experience!',
      })}
      color="warning"
      iconType="iInCircle"
      heading="h2"
    >
      <p>
        {i18n.translate('xpack.infra.logsDeprecationCallout.p.wereExcitedToIntroduceLabel', {
          defaultMessage: `We're excited to introduce a powerful new way to explore logs.\nThis enhanced experience offers better performance and more intuitive navigation.`,
        })}
      </p>
      <p>
        {i18n.translate('xpack.infra.logsDeprecationCallout.p.weRecommendUsingTheLabel', {
          defaultMessage:
            'We recommend using the new Logs Explorer, as the Logs Stream will no longer be supported.',
        })}
      </p>
      <EuiButton
        fill
        data-test-subj="infraLogsDeprecationCalloutTryLogsExplorerButton"
        color="warning"
        {...logsExplorerLinkProps}
      >
        {i18n.translate('xpack.infra.logsDeprecationCallout.tryLogsExplorerButtonLabel', {
          defaultMessage: 'Try Logs Explorer!',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
