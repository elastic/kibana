/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { documentationLinks } from '../../../services/documentation_links';

/*
A component for displaying a deprecation warning.
 */
export const DeprecationCallout = () => {
  return (
    <EuiCallOut title="Deprecated in 8.11.0" color="warning" iconType="warning">
      <FormattedMessage
        id="xpack.rollupJobs.deprecationWarning"
        defaultMessage="Rollups are deprecated and will be removed in a future version. Check our {migrationGuideLink} and use {downsamplingLink} instead."
        values={{
          migrationGuideLink: (
            // TODO: Update doc link once we merge https://github.com/elastic/kibana/pull/185896
            <EuiLink href={documentationLinks.fleet.datastreamsTSDS} target="_blank">
              {i18n.translate('xpack.rollupJobs.create.steps.stepDateHistogramTitle', {
                defaultMessage: 'migration guide',
              })}
            </EuiLink>
          ),
          downsamplingLink: (
            <EuiLink
              href={documentationLinks.elasticsearch.rollupMigratingToDownsampling}
              target="_blank"
            >
              {i18n.translate('xpack.rollupJobs.create.steps.stepDateHistogramTitle', {
                defaultMessage: 'downsampling',
              })}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
