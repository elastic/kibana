/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlyoutFooter, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TopAlert } from '@kbn/observability-plugin/public';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { useKibana } from '../../utils/kibana_react';
import { isAlertDetailsEnabledPerApp } from '../../utils/is_alert_details_enabled';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

export function AlertsFlyoutFooter({ alert, isInApp }: FlyoutProps & { isInApp: boolean }) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;
  const { observability } = useKibana().services;
  const [viewInAppUrl, setViewInAppUrl] = useState<string>();

  useEffect(() => {
    if (!alert.hasBasePath) {
      setViewInAppUrl(prepend(alert.link ?? ''));
    } else {
      setViewInAppUrl(alert.link);
    }
  }, [alert.hasBasePath, alert.link, prepend]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        {!alert.link || isInApp ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="alertsFlyoutViewInAppButton" fill href={viewInAppUrl}>
              {i18n.translate('xpack.slo.alertsFlyoutFooter.', { defaultMessage: '' })}
            </EuiButton>
          </EuiFlexItem>
        )}

        {!isAlertDetailsEnabledPerApp(alert, observability.config) ? null : (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="alertsFlyoutAlertDetailsButton"
              fill
              href={
                prepend &&
                prepend(observabilityPaths.alertDetails(alert.fields['kibana.alert.uuid']))
              }
            >
              {i18n.translate('xpack.slo.alertsFlyoutFooter.', { defaultMessage: '' })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
