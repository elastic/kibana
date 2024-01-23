/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import type { Output } from '../../../../types';

import type { OutputFormInputsType } from './use_output_form';

interface Props {
  inputs: OutputFormInputsType;
  defaultOuput?: Output;
  isStateful?: boolean;
}

export const OutputFormElasticsearchSection: React.FunctionComponent<Props> = ({
  inputs,
  defaultOuput,
  isStateful,
}) => {
  const inputProps = isStateful
    ? inputs.elasticsearchUrlInput.props
    : {
        ...inputs.elasticsearchUrlInput.props,
        disabled: true,
        value:
          inputs.elasticsearchUrlInput.props.value.length > 0
            ? inputs.elasticsearchUrlInput.props.value
            : defaultOuput?.hosts || [],
      };
  return (
    <>
      <MultiRowInput
        data-test-subj="settingsOutputsFlyout.hostUrlInput"
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.esHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.esHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host URL',
          }
        )}
        {...inputProps}
        isUrl
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputLabel"
            defaultMessage="Elasticsearch CA trusted fingerprint (optional)"
          />
        }
        {...inputs.caTrustedFingerprintInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          {...inputs.caTrustedFingerprintInput.props}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputPlaceholder',
            {
              defaultMessage: 'Specify Elasticsearch CA trusted fingerprint',
            }
          )}
        />
      </EuiFormRow>
    </>
  );
};
