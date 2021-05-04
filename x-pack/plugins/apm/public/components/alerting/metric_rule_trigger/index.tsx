/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeEditor } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

interface Props {
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  alertParams: Record<string, any>;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
  chartPreview?: React.ReactNode;
}

export function MetricRuleTrigger(props: Props) {
  const { setAlertParams, alertParams } = props;

  const defaults: Record<string, any> = {
    config: alertParams.config ?? '',
  };

  const [configText, setConfigText] = useState('');

  useEffect(() => {
    // we only want to run this on mount to set default values
    Object.keys({ ...alertParams, ...defaults }).forEach((key) => {
      setAlertParams(key, defaults[key]);
    });

    setConfigText(JSON.stringify(alertParams.config, null, 2));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiSpacer size="l" />
      <EuiCodeEditor
        value={configText}
        onChange={(value) => {
          setConfigText(value);
          try {
            setAlertParams('config', JSON.parse(value));
          } catch (err) {
            // who cares
          }
        }}
      />
      <EuiSpacer size="m" />
    </>
  );
}

// Default export is required for React.lazy loading
//
// eslint-disable-next-line import/no-default-export
export default MetricRuleTrigger;
