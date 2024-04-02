/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for listing pairs of information about the detector for which
 * rules are being edited.
 */

import React from 'react';

import { EuiDescriptionList } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import type { Annotation } from '../../../../../common/types/annotations';

interface Props {
  annotation: Annotation;
  detectorDescription?: string;
}

export const AnnotationDescriptionList = ({ annotation, detectorDescription }: Props) => {
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
      description: annotation.create_username ?? '',
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
      description: annotation.modified_username ?? '',
    });
  }
  if (detectorDescription !== undefined) {
    listItems.push({
      title: i18n.translate('xpack.ml.timeSeriesExplorer.annotationDescriptionList.detectorTitle', {
        defaultMessage: 'Detector',
      }),
      description: detectorDescription,
    });
  }

  if (annotation.partition_field_name !== undefined) {
    listItems.push({
      title: annotation.partition_field_name,
      description: annotation.partition_field_value ?? '',
    });
  }
  if (annotation.over_field_name !== undefined) {
    listItems.push({
      title: annotation.over_field_name,
      description: annotation.over_field_value ?? '',
    });
  }
  if (annotation.by_field_name !== undefined) {
    listItems.push({
      title: annotation.by_field_name,
      description: annotation.by_field_value ?? '',
    });
  }

  return (
    <EuiDescriptionList
      data-test-subj={'mlAnnotationDescriptionList'}
      className="ml-annotation-description-list"
      type="column"
      columnWidths={[3, 7]}
      listItems={listItems}
    />
  );
};
