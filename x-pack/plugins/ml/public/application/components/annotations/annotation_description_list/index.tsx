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

import { i18n } from '@kbn/i18n';
import { Annotation } from '../../../../../common/types/annotations';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';

interface Props {
  annotation: Annotation;
}

export const AnnotationDescriptionList = ({ annotation }: Props) => {
  const listItems = [
    {
      title: i18n.translate('xpack.ml.timeSeriesExplorer.annotationDescriptionList.jobIdTitle', {
        defaultMessage: 'Job ID',
      }),
      description: annotation.job_id,
    },
    {
      title: i18n.translate('xpack.ml.timeSeriesExplorer.annotationDescriptionList.startTitle', {
        defaultMessage: 'Start',
      }),
      description: formatHumanReadableDateTimeSeconds(annotation.timestamp),
    },
  ];

  if (annotation.end_timestamp !== undefined) {
    listItems.push({
      title: i18n.translate('xpack.ml.timeSeriesExplorer.annotationDescriptionList.endTitle', {
        defaultMessage: 'End',
      }),
      description: formatHumanReadableDateTimeSeconds(annotation.end_timestamp),
    });
  }

  if (annotation.create_time !== undefined && annotation.modified_time !== undefined) {
    listItems.push({
      title: i18n.translate('xpack.ml.timeSeriesExplorer.annotationDescriptionList.createdTitle', {
        defaultMessage: 'Created',
      }),
      description: formatHumanReadableDateTimeSeconds(annotation.create_time),
    });
    listItems.push({
      title: i18n.translate(
        'xpack.ml.timeSeriesExplorer.annotationDescriptionList.createdByTitle',
        {
          defaultMessage: 'Created by',
        }
      ),
      description: annotation.create_username,
    });
    listItems.push({
      title: i18n.translate(
        'xpack.ml.timeSeriesExplorer.annotationDescriptionList.lastModifiedTitle',
        {
          defaultMessage: 'Last modified',
        }
      ),
      description: formatHumanReadableDateTimeSeconds(annotation.modified_time),
    });
    listItems.push({
      title: i18n.translate(
        'xpack.ml.timeSeriesExplorer.annotationDescriptionList.modifiedByTitle',
        {
          defaultMessage: 'Modified by',
        }
      ),
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
