/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import type { TiebreakerField as TiebreakerFieldType } from '../../../../../../../../../common/api/detection_engine';

interface TiebreakerFieldReadOnlyProps {
  tiebreakerField?: TiebreakerFieldType;
}

export function TiebreakerFieldReadOnly({ tiebreakerField }: TiebreakerFieldReadOnlyProps) {
  if (!tiebreakerField) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: descriptionStepI18n.EQL_TIEBREAKER_FIELD_LABEL,
          description: <TiebreakerField tiebreakerField={tiebreakerField} />,
        },
      ]}
    />
  );
}

interface TiebreakerFieldProps {
  tiebreakerField: TiebreakerFieldType;
}

function TiebreakerField({ tiebreakerField }: TiebreakerFieldProps) {
  return <EuiText size="s">{tiebreakerField}</EuiText>;
}
