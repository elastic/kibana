/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
  EuiFieldNumber,
} from '@elastic/eui';

interface SettingsFlyoutProps {
  title: string;
  values: {
    n: number;
  };
  onChange: (nextValues: { n: number }) => void;
}

export function SettingsFlyout({ title, values, onChange }: SettingsFlyoutProps) {
  const [formValues, setFormValues] = useState({
    n: values.n.toString(),
  });

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'settings',
  });

  const showFlyout = () => setIsFlyoutVisible(true);

  const closeFlyout = () => setIsFlyoutVisible(false);

  const saveFlyout = () => {
    onChange({
      n: Number(formValues.n),
    });
    setIsFlyoutVisible(false);
  };

  useEffect(() => {
    setFormValues({
      n: values.n.toString(),
    });
  }, [values.n]);

  return (
    <div>
      <EuiButton onClick={showFlyout}>{title}</EuiButton>
      {isFlyoutVisible && (
        <EuiFlyout ownFocus onClose={closeFlyout} hideCloseButton aria-labelledby={flyoutTitleId}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{title}</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiForm component="form">
              <EuiFormRow
                label="N"
                helpText="This is the maximum number of items per histogram bucket (Stack Traces) or is currently ignored (FlameGraph)."
              >
                <EuiFieldNumber
                  name="n"
                  value={formValues.n}
                  onChange={(e) => {
                    setFormValues((nextValues) => ({
                      ...nextValues,
                      n: e.target.value,
                    }));
                  }}
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={saveFlyout} fill>
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </div>
  );
}
