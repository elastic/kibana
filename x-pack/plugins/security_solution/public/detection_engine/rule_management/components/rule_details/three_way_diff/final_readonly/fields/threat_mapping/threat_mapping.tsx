/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { ThreatMapping } from '../../../../../../../../../common/api/detection_engine';
import { ThreatMapping as ThreatMappingComponent } from '../../../../rule_definition_section';
import * as ruleDetailsI18n from '../../../../translations';

export interface ThreatMappingReadOnlyProps {
  threatMapping: ThreatMapping;
}

export const ThreatMappingReadOnly = ({ threatMapping }: ThreatMappingReadOnlyProps) => {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.THREAT_MAPPING_FIELD_LABEL,
          description: <ThreatMappingComponent threatMapping={threatMapping} />,
        },
      ]}
    />
  );
};
