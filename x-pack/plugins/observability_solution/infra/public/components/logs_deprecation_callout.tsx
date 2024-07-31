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
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const DISMISSAL_STORAGE_KEY = 'log_stream_deprecation_callout_dismissed';

export const LogsDeprecationCallout = () => {
  const {
    services: { share },
  } = useKibanaContextForPlugin();

  const [isDismissed, setDismissed] = useLocalStorage(DISMISSAL_STORAGE_KEY, false);

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      title={i18n.translate('xpack.infra.logsDeprecationCallout.euiCallOut.discoverANewLogLabel', {
        defaultMessage: "There's a new, better way to explore your logs!",
      })}
      color="warning"
      iconType="iInCircle"
      heading="h2"
      onDismiss={() => setDismissed(true)}
      className={calloutStyle}
    >
      <p>
        {i18n.translate('xpack.infra.logsDeprecationCallout.p.theNewLogsExplorerLabel', {
          defaultMessage:
            'The new Logs Explorer makes viewing and inspecting your logs easier with more features, better performance, and more intuitive navigation. We recommend switching to Logs Explorer, as it will replace Logs Stream in a future version.',
        })}
      </p>
      <EuiButton
        fill
        data-test-subj="infraLogsDeprecationCalloutTryLogsExplorerButton"
        color="warning"
        {...getLogsExplorerLinkProps(share)}
      >
        {i18n.translate('xpack.infra.logsDeprecationCallout.tryLogsExplorerButtonLabel', {
          defaultMessage: 'Try Logs Explorer',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};

const getLogsExplorerLinkProps = (share: SharePublicStart) => {
  const locator = share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;

  return getRouterLinkProps({
    href: locator.getRedirectUrl({}),
    onClick: () => locator.navigate({}),
  });
};

const calloutStyle = css`
  margin-bottom: ${euiThemeVars.euiSizeL};
`;
