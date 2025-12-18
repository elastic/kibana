/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSwitch, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CriticalPathToggle({ checked, onChange }: Props) {
  const htmlId = useMemo(() => htmlIdGenerator(), []);

  return (
    <EuiSwitch
      id={htmlId('showCriticalPath')}
      label={i18n.translate('xpack.apm.traceWaterfall.showCriticalPath', {
        defaultMessage: 'Show critical path',
      })}
      checked={checked}
      onChange={(event) => {
        onChange(event.target.checked);
      }}
    />
  );
}
