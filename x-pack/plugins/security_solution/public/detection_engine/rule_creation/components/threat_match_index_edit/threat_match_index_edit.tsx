/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FieldConfig } from '../../../../shared_imports';
import { customValidators } from '../../../../common/components/threat_match/helpers';
import { UseField, fieldValidators } from '../../../../shared_imports';
import { ThreatMatchIndexField } from './threat_match_index_field';
import * as i18n from './translations';

interface ThreatMatchIndexEditProps {
  path: string;
}

export function ThreatMatchIndexEdit({ path }: ThreatMatchIndexEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      component={ThreatMatchIndexField}
      config={THREAT_MATCH_INDEX_FIELD_CONFIG}
    />
  );
}

const THREAT_MATCH_INDEX_FIELD_CONFIG: FieldConfig<string[]> = {
  validations: [
    {
      validator: fieldValidators.emptyField(
        i18n.THREAT_MATCH_INDEX_FIELD_VALIDATION_REQUIRED_ERROR
      ),
    },
    {
      validator: (...args) => {
        const [{ value }] = args;

        return customValidators.forbiddenField(value, '*');
      },
    },
  ],
};
