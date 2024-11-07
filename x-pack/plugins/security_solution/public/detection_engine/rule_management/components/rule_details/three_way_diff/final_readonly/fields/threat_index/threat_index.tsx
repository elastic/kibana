/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import { ThreatIndex } from '../../../../rule_definition_section';

export interface ThreatIndexReadOnlyProps {
  threatIndex: string[];
}

export const ThreatIndexReadOnly = ({ threatIndex }: ThreatIndexReadOnlyProps) => {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.THREAT_INDEX_FIELD_LABEL,
          description: <ThreatIndex threatIndex={threatIndex} />,
        },
      ]}
    />
  );
};
