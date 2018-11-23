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
import { Annotation } from '../../../../common/interfaces/annotations';

interface Props {
  annotation: Annotation;
}

export const AnnotationDescriptionList: React.SFC<Props> = ({ annotation }) => {
  const listItems = [
    {
      title: 'Job ID',
      description: annotation.job_id,
    },
    {
      title: 'Start',
      description: formatDate(annotation.timestamp, 'MMMM Do YYYY, HH:mm:ss'),
    },
    {
      title: 'End',
      description: formatDate(annotation.end_timestamp, 'MMMM Do YYYY, HH:mm:ss'),
    },
  ];

  return (
    <EuiDescriptionList
      className="ml-annotation-description-list"
      type="column"
      listItems={listItems}
    />
  );
};
