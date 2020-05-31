/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';

import { TimelineType, TimelineTypeLiteralWithNull } from '../../../../../common/types/timeline';

import { defaultToEmptyTag } from '../../../../common/components/empty_value';

import * as i18n from '../translations';
import { OpenTimelineResult } from '../types';

/**
 * Returns the template columns that are specific to the `Timelines` view
 * of the `Timelines` page
 */

export const getTemplateColumns = (timelineType: TimelineTypeLiteralWithNull) => {
  if (timelineType !== TimelineType.default) return [];

  return [
    {
      dataType: 'string',
      field: 'templateTimelineId',
      name: i18n.TIMELINE_TEMPLATE,
      render: (templateTimelineId: OpenTimelineResult['templateTimelineId']) => (
        <div data-test-subj="timelineType">{defaultToEmptyTag(templateTimelineId)}</div>
      ),
      sortable: false,
    },
  ];
};
