/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { DataStreamDetails, DataStreamSettings } from '../../../common/data_streams_stats';
import {
  flyoutDatasetCreatedOnText,
  flyoutDatasetDetailsText,
  flyoutDatasetLastActivityText,
} from '../../../common/translations';
import { FieldsList, FieldsListLoading } from './fields_list';

interface DatasetSummaryProps {
  fieldFormats: FieldFormatsStart;
  dataStreamSettings?: DataStreamSettings;
  dataStreamSettingsLoading: boolean;
  dataStreamDetails?: DataStreamDetails;
  dataStreamDetailsLoading: boolean;
}

export function DatasetSummary({
  dataStreamSettings,
  dataStreamSettingsLoading,
  dataStreamDetails,
  dataStreamDetailsLoading,
  fieldFormats,
}: DatasetSummaryProps) {
  const dataFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);
  const formattedLastActivity = dataStreamDetails?.lastActivity
    ? dataFormatter.convert(dataStreamDetails?.lastActivity)
    : '-';
  const formattedCreatedOn = dataStreamSettings?.createdOn
    ? dataFormatter.convert(dataStreamSettings.createdOn)
    : '-';

  return (
    <FieldsList
      title={flyoutDatasetDetailsText}
      fields={[
        {
          fieldTitle: flyoutDatasetLastActivityText,
          fieldValue: formattedLastActivity,
          isLoading: dataStreamDetailsLoading,
        },
        {
          fieldTitle: flyoutDatasetCreatedOnText,
          fieldValue: formattedCreatedOn,
          isLoading: dataStreamSettingsLoading,
        },
      ]}
    />
  );
}

export function DatasetSummaryLoading() {
  return <FieldsListLoading />;
}
