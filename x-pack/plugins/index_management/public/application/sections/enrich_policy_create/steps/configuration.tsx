/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

interface Props {
  onNext: () => void;
}

export const ConfigurationStep = ({ onNext }: Props) => {
  const [editorValue, setEditorValue] = useState('');

  return (
    <EuiForm component="form">
      <EuiFormRow label="Policy name">
        <EuiFieldText name="name" />
      </EuiFormRow>

      <EuiFormRow label="Policy type">
        <EuiSelect
          onChange={() => {}}
          options={[
            { value: 'match', text: 'Match' },
            { value: 'geo_match', text: 'Geo match' },
            { value: 'range', text: 'Range' },
          ]}
        />
      </EuiFormRow>

      <EuiFormRow label="Source indices">
        <EuiSelect
          hasNoInitialSelection
          onChange={() => {}}
          options={[
            { value: 'option_one', text: 'Option one' },
            { value: 'option_two', text: 'Option two' },
            { value: 'option_three', text: 'Option three' },
          ]}
        />
      </EuiFormRow>

      <EuiFormRow label="Query (optional)">
        <CodeEditor
          languageId="json"
          isCopyable
          allowFullScreen
          data-test-subj="queryEditor"
          value={editorValue}
          onChange={(value) => setEditorValue(value)}
          height={300}
          options={{
            lineNumbers: 'off',
            tabSize: 2,
            automaticLayout: true,
          }}
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
