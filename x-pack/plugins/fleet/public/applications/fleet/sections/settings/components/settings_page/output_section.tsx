/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiText, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useLink } from '../../../../hooks';
import type { Output } from '../../../../types';
import { OutputsTable } from '../outputs_table';

export interface OutputSectionProps {
  outputs: Output[];
  deleteOutput: (output: Output) => void;
}

export const OutputSection: React.FunctionComponent<OutputSectionProps> = ({
  outputs,
  deleteOutput,
}) => {
  const { getHref } = useLink();

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage id="xpack.fleet.settings.outputSectionTitle" defaultMessage="Outputs" />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="m">
        <FormattedMessage
          id="xpack.fleet.settings.outputSectionSubtitle"
          defaultMessage="Specify where agents will send data."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <OutputsTable outputs={outputs} deleteOutput={deleteOutput} />
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        href={getHref('settings_create_outputs')}
        data-test-subj="addOutputBtn"
      >
        <FormattedMessage
          id="xpack.fleet.settings.outputCreateButtonLabel"
          defaultMessage="Add output"
        />
      </EuiButtonEmpty>
    </>
  );
};
