/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import type { TimestampField as TimestampFieldType } from '../../../../../../../../../common/api/detection_engine';

interface TimestampFieldReadOnlyProps {
  timestampField?: TimestampFieldType;
}

export function TimestampFieldReadOnly({ timestampField }: TimestampFieldReadOnlyProps) {
  if (!timestampField) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: descriptionStepI18n.EQL_TIMESTAMP_FIELD_LABEL,
          description: <TimestampField timestampField={timestampField} />,
        },
      ]}
    />
  );
}

interface EventCategoryOverrideProps {
  timestampField: TimestampFieldType;
}

function TimestampField({ timestampField }: EventCategoryOverrideProps) {
  return <EuiText size="s">{timestampField}</EuiText>;
}
