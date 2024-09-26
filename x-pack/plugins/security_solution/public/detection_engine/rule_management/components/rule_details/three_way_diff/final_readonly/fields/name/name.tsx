/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { RuleName } from '../../../../../../../../../common/api/detection_engine';

interface NameReadOnlyProps {
  name: RuleName;
}

export function NameReadOnly({ name }: NameReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.NAME_FIELD_LABEL,
          description: <Name name={name} />,
        },
      ]}
    />
  );
}

interface NameProps {
  name: RuleName;
}

function Name({ name }: NameProps) {
  return <>{name}</>;
}
