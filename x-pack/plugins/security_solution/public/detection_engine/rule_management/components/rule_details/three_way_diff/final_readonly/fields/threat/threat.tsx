/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import * as ruleDetailsI18n from '../../../../translations';
import { Threat } from '../../../../rule_about_section';

export interface ThreatReadOnlyProps {
  threat: Threats;
}

export const ThreatReadOnly = ({ threat }: ThreatReadOnlyProps) => {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.THREAT_FIELD_LABEL,
          description: <Threat threat={threat} />,
        },
      ]}
    />
  );
};
