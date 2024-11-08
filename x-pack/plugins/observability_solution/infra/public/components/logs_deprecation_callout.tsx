/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
  DatasetLocatorParams,
  OBSERVABILITY_LOGS_EXPLORER_APP_ID,
} from '@kbn/deeplinks-observability';
import { getRouterLinkProps } from '@kbn/router-utils';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AppStatus } from '@kbn/core/public';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { useKibanaContextForPlugin } from '../hooks/use_kibana';

const DISMISSAL_STORAGE_KEY = 'log_stream_deprecation_callout_dismissed';

export const LogsDeprecationCallout = () => {
  const {
    services: { share, application },
  } = useKibanaContextForPlugin();

  const [isDismissed, setDismissed] = useLocalStorage(DISMISSAL_STORAGE_KEY, false);

  const isLogsExplorerAppAccessible = useObservable(
    useMemo(
      () =>
        application.applications$.pipe(
          map(
            (apps) =>
              (apps.get(OBSERVABILITY_LOGS_EXPLORER_APP_ID)?.status ?? AppStatus.inaccessible) ===
              AppStatus.accessible
          )
        ),
      [application.applications$]
    ),
    false
  );

  if (isDismissed || !isLogsExplorerAppAccessible) {
    return null;
  }

  const allDatasetLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

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
        {...getLogsExplorerLinkProps(allDatasetLocator!)}
      >
        {i18n.translate('xpack.infra.logsDeprecationCallout.tryLogsExplorerButtonLabel', {
          defaultMessage: 'Try Logs Explorer',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};

const getLogsExplorerLinkProps = (locator: LocatorPublic<DatasetLocatorParams>) => {
  return getRouterLinkProps({
    href: locator.getRedirectUrl({}),
    onClick: () => locator.navigate({}),
  });
};

const calloutStyle = css`
  margin-bottom: ${euiThemeVars.euiSizeL};
`;
