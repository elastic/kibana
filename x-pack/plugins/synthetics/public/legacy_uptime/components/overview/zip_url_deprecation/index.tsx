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
import { getHasZipUrlMonitors } from '../../../state/api/has_zip_url_monitors';
import { getDocLinks } from '../../../../kibana_services';
import { monitorListSelector } from '../../../state/selectors';

export const ZIP_URL_DEPRECATION_SESSION_STORAGE_KEY =
  'SYNTHETICS_ZIP_URL_DEPRECATION_HAS_BEEN_DISMISSED';

export const ZipUrlDeprecation = () => {
  const monitorList = useSelector(monitorListSelector);
  const noticeHasBeenDismissed =
    window.sessionStorage.getItem(ZIP_URL_DEPRECATION_SESSION_STORAGE_KEY) === 'true';
  const { data, loading } = useFetcher(() => {
    // load it when list is loaded
    if (!noticeHasBeenDismissed && monitorList.isLoaded) {
      return getHasZipUrlMonitors();
    }
    return undefined;
  }, [monitorList.isLoaded]);
  const hasZipUrlMonitors = !loading && data && data.hasZipUrlMonitors;
  const [shouldShowNotice, setShouldShowNotice] = useState(
    Boolean(hasZipUrlMonitors && !noticeHasBeenDismissed)
  );

  const handleDismissDeprecationNotice = () => {
    window.sessionStorage.setItem(ZIP_URL_DEPRECATION_SESSION_STORAGE_KEY, 'true');
    setShouldShowNotice(false);
  };

  useEffect(() => {
    setShouldShowNotice(Boolean(hasZipUrlMonitors && !noticeHasBeenDismissed));
  }, [hasZipUrlMonitors, noticeHasBeenDismissed]);

  return shouldShowNotice ? (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.synthetics.browser.zipUrl.deprecation.title"
            defaultMessage="Deprecation notice"
          />
        }
        color="warning"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <span>
              <FormattedMessage
                id="xpack.synthetics.browser.zipUrl.deprecation.content"
                defaultMessage="Zip URL is deprecated and will be removed in a future version. Use project monitors instead to create monitors from a remote repository and to migrate existing Zip URL monitors. {link}"
                values={{
                  link: (
                    <EuiLink
                      target="_blank"
                      href={getDocLinks()?.links?.observability?.syntheticsProjectMonitors}
                      external
                    >
                      <FormattedMessage
                        id="xpack.synthetics.browser.zipUrl.deprecation.link"
                        defaultMessage="Learn more"
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
                id="xpack.synthetics.browser.zipUrl.deprecation.dismiss"
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
