/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { APMLink } from '../../../shared/Links/apm/APMLink';

export function MLCallout({ onDismiss }: { onDismiss: () => void }) {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.serviceOverview.mlNudgeMessage.title', {
        defaultMessage:
          'Enable anomaly detection to see the health of your services',
      })}
      iconType="iInCircle"
    >
      <p>
        {i18n.translate('xpack.apm.serviceOverview.mlNudgeMessage.content', {
          defaultMessage: `Our integration with ML anomaly detection will enable you to see your services' health status`,
        })}
      </p>
      <EuiFlexGrid gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton>
            <APMLink
              path="/settings/anomaly-detection"
              style={{ whiteSpace: 'nowrap' }}
            >
              {i18n.translate(
                'xpack.apm.serviceOverview.mlNudgeMessage.learnMoreButton',
                {
                  defaultMessage: `Learn more`,
                }
              )}
            </APMLink>
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => onDismiss()}>
            {i18n.translate(
              'xpack.apm.serviceOverview.mlNudgeMessage.dismissButton',
              {
                defaultMessage: `Dismiss message`,
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiCallOut>
  );
}
