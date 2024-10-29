/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { TimelineTemplateReference } from '../../../../../../../../../common/api/detection_engine';
import { TimelineTitle } from '../../../../rule_definition_section';

interface TimelineTemplateReadOnlyProps {
  timelineTemplate?: TimelineTemplateReference;
}

export function TimelineTemplateReadOnly({ timelineTemplate }: TimelineTemplateReadOnlyProps) {
  if (!timelineTemplate) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.TIMELINE_TITLE_FIELD_LABEL,
          description: <TimelineTitle timelineTitle={timelineTemplate.timeline_title} />,
        },
      ]}
    />
  );
}
