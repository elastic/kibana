/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import { threatMatchMappingValidatorFactory } from '../../../rule_creation_ui/validators/threat_match_mapping_validator';
import { ThreatMatchField } from './threat_match_mapping_field';
import * as i18n from './translations';

interface ThreatMatchMappingEditProps {
  path: string;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
}

export const ThreatMatchMappingEdit = memo(function ThreatMatchEdit({
  path,
  indexPatterns,
  threatIndexPatterns,
}: ThreatMatchMappingEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      config={THREAT_MATCH_MAPPING_FIELD_CONFIG}
      component={ThreatMatchField}
      componentProps={{
        indexPatterns,
        threatIndexPatterns,
      }}
    />
  );
});

const THREAT_MATCH_MAPPING_FIELD_CONFIG: FieldConfig<ThreatMapEntries[]> = {
  label: i18n.THREAT_MATCH_MAPPING_FIELD_LABEL,
  validations: [
    {
      validator: threatMatchMappingValidatorFactory(),
    },
  ],
};
