/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useCallback } from 'react';
import { ArgumentStrings } from '../../../i18n';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const { Textarea: strings } = ArgumentStrings;

const TextAreaArgInput = ({ argValue, typeInstance, onValueChange, renderError, argId }) => {
  const confirm = typeInstance?.options?.confirm;
  const [value, setValue] = useState(argValue);

  const onChange = useCallback(
    (ev) => {
      const { value } = ev.target;
      setValue(value);
      if (!confirm) {
        onValueChange(value);
      }
    },
    [confirm, onValueChange]
  );

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  if (typeof argValue !== 'string') {
    renderError();
    return null;
  }

  return (
    <div>
      <EuiFormRow display="rowCompressed">
        <EuiTextArea
          className="canvasTextArea__code"
          id={argId}
          compressed={true}
          rows={10}
          value={value}
          resize="none"
          onChange={onChange}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={() => onValueChange(value)}>
        {confirm}
      </EuiButton>
      <EuiSpacer size="xs" />
    </div>
  );
};

TextAreaArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  renderError: PropTypes.func,
  argId: PropTypes.string.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const textarea = () => ({
  name: 'textarea',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(withDebounceArg(TextAreaArgInput)),
});
