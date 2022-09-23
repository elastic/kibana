/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-plugin/public';
import { getHasZipUrlMonitors } from '../../../state/api/has_zip_url_monitors';

export const ZipUrlDeprecation = () => {
  const { data, loading } = useFetcher(() => {
    return getHasZipUrlMonitors();
  }, []);
  const hasZipUrlMonitors = !loading && data && data.hasZipUrlMonitors;
  return hasZipUrlMonitors ? (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.deprecation.title"
          defaultMessage="Deprecation notice"
        />
      }
      size="s"
      color="warning"
    >
      <FormattedMessage
        id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.deprecation.content"
        defaultMessage="Zip URL source is deprecated and will be removed in a future version. Project monitors are now available to create monitors from a remote repository. For more information, {link}"
        values={{
          link: (
            <EuiLink target="_blank" href="" external>
              <FormattedMessage
                id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.monitorType.browser.warning.link"
                defaultMessage="read the documentation"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  ) : null;
};
