/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFormRow, EuiIcon, EuiTextArea, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

interface InstructionsFieldProps {
  value?: string;
  onChange: (value: string) => void;
}

export const InstructionsField: React.FC<InstructionsFieldProps> = ({ value, onChange }) => {
  const [baseValue, setBaseValue] = React.useState(value);
  const usageTracker = useUsageTracker();
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  const handleFocus = () => {
    setBaseValue(value);
  };
  const handleBlur = () => {
    if (baseValue !== value) {
      usageTracker?.click(AnalyticsEvents.instructionsFieldChanged);
    }
    setBaseValue('');
  };

  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={i18n.translate('xpack.searchPlayground.sidebar.instructionsField.help', {
            defaultMessage:
              'These preliminary instructions and guidelines define the behavior of the model. Be clear and specific for best results.',
          })}
        >
          <>
            <span>
              {i18n.translate('xpack.searchPlayground.sidebar.instructionsField.label', {
                defaultMessage: 'Instructions',
              })}
            </span>
            <EuiIcon type="questionInCircle" color="subdued" />
          </>
        </EuiToolTip>
      }
      fullWidth
    >
      <EuiTextArea
        placeholder={i18n.translate(
          'xpack.searchPlayground.sidebar.instructionsField.placeholder',
          {
            defaultMessage: 'Replace me',
          }
        )}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handlePromptChange}
        fullWidth
        isInvalid={isEmpty(value)}
      />
    </EuiFormRow>
  );
};
