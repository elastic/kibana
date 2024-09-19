/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import type { EventCategoryOverride as EventCategoryOverrideType } from '../../../../../../../../../common/api/detection_engine';

interface EventCategoryOverrideReadOnlyProps {
  eventCategoryOverride?: EventCategoryOverrideType;
}

export function EventCategoryOverrideReadOnly({
  eventCategoryOverride,
}: EventCategoryOverrideReadOnlyProps) {
  if (!eventCategoryOverride) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: descriptionStepI18n.EQL_EVENT_CATEGORY_FIELD_LABEL,
          description: <EventCategoryOverride eventCategoryOverride={eventCategoryOverride} />,
        },
      ]}
    />
  );
}

interface EventCategoryOverrideProps {
  eventCategoryOverride: EventCategoryOverrideType;
}

function EventCategoryOverride({ eventCategoryOverride }: EventCategoryOverrideProps) {
  return <EuiText size="s">{eventCategoryOverride}</EuiText>;
}
