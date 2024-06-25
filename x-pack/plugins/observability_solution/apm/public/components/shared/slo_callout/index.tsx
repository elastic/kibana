/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { sloEditLocatorID } from '@kbn/observability-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

interface Props {
  dismissCallout: () => void;
  serviceName: string;
  environment: string;
  transactionType?: string;
  transactionName?: string;
}

export function SloCallout({
  dismissCallout,
  serviceName,
  environment,
  transactionType,
  transactionName,
}: Props) {
  const {
    plugins: {
      share: {
        url: { locators },
      },
    },
  } = useApmPluginContext();

  const locator = locators.get(sloEditLocatorID);

  const handleClick = () => {
    locator?.navigate(
      {
        indicator: {
          type: 'sli.apm.transactionErrorRate',
          params: {
            service: serviceName,
            environment: environment === ENVIRONMENT_ALL.value ? '*' : environment,
            transactionName,
            transactionType,
          },
        },
      },
      {
        replace: false,
      }
    );
  };

  return (
    <EuiCallOut
      title={i18n.translate('xpack.apm.slo.callout.title', {
        defaultMessage: 'Respond quicker with SLOs',
      })}
      iconType="lock"
    >
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <p>
            <FormattedMessage
              id="xpack.apm.slo.callout.description"
              defaultMessage="Keep your service's performance, speed, and user experience high with a Service Level Objective (SLO)."
            />
          </p>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                data-test-subj="apmSloCalloutCreateSloButton"
                onClick={() => {
                  handleClick();
                  dismissCallout();
                }}
              >
                {i18n.translate('xpack.apm.slo.callout.createButton', {
                  defaultMessage: 'Create SLO',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                data-test-subj="apmSloDismissButton"
                onClick={() => {
                  dismissCallout();
                }}
              >
                {i18n.translate('xpack.apm.slo.callout.dimissButton', {
                  defaultMessage: 'Hide this',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
