/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCodeBlock, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';

interface Props {
  inputs: OutputFormInputsType;
}

export const OutputFormRemoteEsSection: React.FunctionComponent<Props> = (props) => {
  const { inputs } = props;

  return (
    <>
      <MultiRowInput
        data-test-subj="settingsOutputsFlyout.hostUrlInput"
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host URL',
          }
        )}
        {...inputs.elasticsearchUrlInput.props}
        isUrl
      />
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.serviceTokenLabel"
            defaultMessage="Service Token"
          />
        }
        {...inputs.serviceTokenInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          {...inputs.serviceTokenInput.props}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.remoteESHostPlaceholder',
            {
              defaultMessage: 'Specify service token',
            }
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.serviceTokenCalloutText"
            defaultMessage="Generate a service token in the remote cluster with this API call and copy the value."
          />
        }
        data-test-subj="serviceTokenCallout"
      >
        <EuiCodeBlock isCopyable={true}>
          {`curl -XPOST 'https://REMOTE_KIBANA_HOST:PORT/api/fleet/service_tokens?remote=true' -H 'kbn-xsrf: remote-es' -u USER:PASSWORD`}
        </EuiCodeBlock>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
