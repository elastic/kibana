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

interface DeprecationCalloutProps {
  /** The prefix to be applied at the test subjects for the doc links.
   * Used for clicks tracking in Fullstory. */
  linksTestSubjPrefix: string;
}

/*
A component for displaying a deprecation warning.
 */
export const DeprecationCallout = ({ linksTestSubjPrefix }: DeprecationCalloutProps) => {
  return (
    <EuiCallOut
      title="Deprecated in 8.11.0"
      color="warning"
      iconType="warning"
      data-test-subj="rollupDeprecationCallout"
    >
      <FormattedMessage
        id="xpack.rollupJobs.deprecationCalloutMessage"
        defaultMessage="Rollups are deprecated and will be removed in a future version. Check our {migrationGuideLink} and use {downsamplingLink} instead."
        values={{
          migrationGuideLink: (
            <EuiLink
              href={documentationLinks.elasticsearch.rollupMigratingToDownsampling}
              target="_blank"
              data-test-subj={`${linksTestSubjPrefix}-rollupDeprecationCalloutMigrationGuideLink`}
            >
              {i18n.translate('xpack.rollupJobs.deprecationCallout.migrationGuideLink', {
                defaultMessage: 'migration guide',
              })}
            </EuiLink>
          ),
          downsamplingLink: (
            <EuiLink
              href={documentationLinks.fleet.datastreamsDownsampling}
              target="_blank"
              data-test-subj={`${linksTestSubjPrefix}-rollupDeprecationCalloutDownsamplingDocLink`}
            >
              {i18n.translate('xpack.rollupJobs.deprecationCallout.downsamplingLink', {
                defaultMessage: 'downsampling',
              })}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
