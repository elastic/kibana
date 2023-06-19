/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  dismissCallout: () => void;
  sloParams: string;
}

export function SloCallout({ dismissCallout, sloParams }: Props) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
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
              defaultMessage="How quickly will you respon if the service goes down? Keep the performance, speed and user experience high with a SLO"
            />
          </p>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                data-test-subj="apmCreateSloButton"
                href={basePath.prepend(
                  `/app/observability/slos/create${sloParams}`
                )}
              >
                {i18n.translate('xpack.apm.slo.callout.createButton', {
                  defaultMessage: 'Create SLO',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                color="text"
                data-test-subj="apmSloDismissButton"
                onClick={() => {
                  dismissCallout();
                }}
              >
                {i18n.translate('xpack.apm.slo.callout.dimissButton', {
                  defaultMessage: 'Hide this',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}
