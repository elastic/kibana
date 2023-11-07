/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { RecreateJobCallout } from './recreate_job_callout';

export const JobConfigurationOutdatedCallout: React.FC<{
  hasSetupCapabilities: boolean;
  moduleName: string;
  onRecreateMlJob: () => void;
}> = ({ hasSetupCapabilities, moduleName, onRecreateMlJob }) => (
  <RecreateJobCallout
    hasSetupCapabilities={hasSetupCapabilities}
    title={i18n.translate('xpack.infra.logs.analysis.jobConfigurationOutdatedCalloutTitle', {
      defaultMessage: 'The {moduleName} ML job configuration is outdated',
      values: {
        moduleName,
      },
    })}
    onRecreateMlJob={onRecreateMlJob}
  >
    <FormattedMessage
      id="xpack.infra.logs.analysis.jobConfigurationOutdatedCalloutMessage"
      defaultMessage="The {moduleName} ML job was created using a different source configuration. Recreate the job to apply the current configuration. This removes previously detected anomalies."
      values={{
        moduleName,
      }}
      tagName="p"
    />
  </RecreateJobCallout>
);
