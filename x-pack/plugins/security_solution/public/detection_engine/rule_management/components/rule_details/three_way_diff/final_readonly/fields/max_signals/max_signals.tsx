/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { MaxSignals as MaxSignalsType } from '../../../../../../../../../common/api/detection_engine';
import { MaxSignals } from '../../../../rule_about_section';

interface MaxSignalsReadOnlyProps {
  maxSignals: MaxSignalsType;
}

export function MaxSignalsReadOnly({ maxSignals }: MaxSignalsReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.MAX_SIGNALS_FIELD_LABEL,
          description: <MaxSignals maxSignals={maxSignals} />,
        },
      ]}
    />
  );
}
