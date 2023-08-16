/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiForm, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';

interface Props {
  onNext: () => void;
}

export const FieldSelectionStep = ({ onNext }: Props) => {
  return (
    <EuiForm component="form">
      <EuiFormRow label="Match field">
        <EuiSelect
          onChange={() => {}}
          options={[
            { value: 'match', text: 'location' },
            { value: 'geo_match', text: 'name' },
            { value: 'range', text: 'dob' },
          ]}
        />
      </EuiFormRow>

      <EuiFormRow label="Enrich fields">
        <EuiSelect
          onChange={() => {}}
          options={[
            { value: 'option_one', text: 'Field 1' },
            { value: 'option_two', text: 'Field 2' },
            { value: 'option_three', text: 'Field 3' },
          ]}
        />
      </EuiFormRow>

      <EuiSpacer />

      <EuiButton
        fill
        color="primary"
        iconSide="right"
        iconType="arrowRight"
        onClick={onNext}
      >
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.create.stepConfiguration.nextButtonLabel"
          defaultMessage="Next"
        />
      </EuiButton>
    </EuiForm>
  );
};
