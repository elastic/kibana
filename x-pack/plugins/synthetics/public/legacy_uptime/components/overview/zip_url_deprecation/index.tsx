/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiButton, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useSelector } from 'react-redux';
import { getHasIntegrationMonitors } from '../../../state/api/has_integration_monitors';
import { getDocLinks } from '../../../../kibana_services';
import { monitorListSelector } from '../../../state/selectors';

export const INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY =
  'SYNTHETICS_INTEGRATION_DEPRECATION_HAS_BEEN_DISMISSED';

export const IntegrationDeprecation = () => {
  const monitorList = useSelector(monitorListSelector);
  const noticeHasBeenDismissed =
    window.sessionStorage.getItem(INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY) === 'true';
  const { data, loading } = useFetcher(() => {
    // load it when list is loaded
    if (!noticeHasBeenDismissed && monitorList.isLoaded) {
      return getHasIntegrationMonitors();
    }
    return undefined;
  }, [monitorList.isLoaded]);
  const hasIntegrationMonitors = !loading && data && data.hasIntegrationMonitors;
  const [shouldShowNotice, setShouldShowNotice] = useState(
    Boolean(hasIntegrationMonitors && !noticeHasBeenDismissed)
  );

  const handleDismissDeprecationNotice = () => {
    window.sessionStorage.setItem(INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY, 'true');
    setShouldShowNotice(false);
  };

  useEffect(() => {
    setShouldShowNotice(Boolean(hasIntegrationMonitors && !noticeHasBeenDismissed));
  }, [hasIntegrationMonitors, noticeHasBeenDismissed]);

  return shouldShowNotice ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.integration.deprecation.title"
            defaultMessage="Migrate your Elastic Synthetics integration monitors before Elastic 8.8"
          />
        }
        color="warning"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <span>
              <FormattedMessage
                id="xpack.synthetics.integration.deprecation.content"
                defaultMessage="You have at least one monitor configured using the Elastic Synthetics integration. From Elastic 8.8, the integration will be deprecated and you will no longer be able to edit these monitors. To avoid this, migrate them to Project monitors or add them to the new Synthetics app directly available in Observability before the 8.8 update. Check our {link} for more details."
                values={{
                  link: (
                    <EuiLink
                      target="_blank"
                      href={getDocLinks()?.links?.observability?.syntheticsProjectMonitors}
                      external
                    >
                      <FormattedMessage
                        id="xpack.synthetics.integration.deprecation.link"
                        defaultMessage="Synthetics migration docs"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={handleDismissDeprecationNotice} color="warning">
              <FormattedMessage
                id="xpack.synthetics.integration.deprecation.dismiss"
                defaultMessage="Dismiss"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  ) : null;
};
