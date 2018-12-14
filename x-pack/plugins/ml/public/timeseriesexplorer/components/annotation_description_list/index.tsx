/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for listing pairs of information about the detector for which
 * rules are being edited.
 */

import React from 'react';

import { EuiDescriptionList } from '@elastic/eui';

// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { Annotation } from '../../../../common/types/annotations';

interface Props {
  annotation: Annotation;
}

function formatListDate(ts: number) {
  return formatDate(ts, 'MMMM Do YYYY, HH:mm:ss');
}

export const AnnotationDescriptionList: React.SFC<Props> = ({ annotation }) => {
  const listItems = [
    {
      title: 'Job ID',
      description: annotation.job_id,
    },
    {
      title: 'Start',
      description: formatListDate(annotation.timestamp),
    },
  ];

  if (annotation.end_timestamp !== undefined) {
    listItems.push({
      title: 'End',
      description: formatListDate(annotation.end_timestamp),
    });
  }

  if (annotation.create_time !== undefined && annotation.modified_time !== undefined) {
    listItems.push({
      title: 'Created',
      description: formatListDate(annotation.create_time),
    });
    listItems.push({
      title: 'Created by',
      description: annotation.create_username,
    });
    listItems.push({
      title: 'Last modified',
      description: formatListDate(annotation.modified_time),
    });
    listItems.push({
      title: 'Modified by',
      description: annotation.modified_username,
    });
  }

  return (
    <EuiDescriptionList
      className="ml-annotation-description-list"
      type="column"
      listItems={listItems}
    />
  );
};
