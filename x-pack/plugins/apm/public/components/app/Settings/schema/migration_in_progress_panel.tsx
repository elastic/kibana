/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiCard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function MigrationInProgressPanel() {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem style={{ maxWidth: '500px' }}>
        <EuiCard
          icon={<EuiLoadingSpinner size="xl" />}
          title={i18n.translate(
            'xpack.apm.settings.schema.migrationInProgressPanelTitle',
            { defaultMessage: 'Switching to Elastic Agent...' }
          )}
          description={i18n.translate(
            'xpack.apm.settings.schema.migrationInProgressPanelDescription',
            {
              defaultMessage:
                "We're now creating a Fleet Server instance to contain the new APM Server while shutting down the old APM server instance. Within minutes you should see your data pour into the app again.",
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
