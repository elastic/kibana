/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import * as constants from '../../common/constants';

const smartFields = [
  {
    name: constants.RESOURCE_FIELD,
    displayName: constants.RESOURCE_FIELD,
    type: 'smart_field',
  } as DataViewField,
  {
    name: constants.CONTENT_FIELD,
    displayName: constants.CONTENT_FIELD,
    type: 'smart_field',
  } as DataViewField,
];

export const additionalFieldGroups = [
  {
    SmartFields: {
      fields: smartFields,
      fieldCount: smartFields.length,
      isAffectedByGlobalFilter: false,
      isAffectedByTimeFilter: false,
      isInitiallyOpen: true,
      showInAccordion: true,
      hideDetails: false,
      hideIfEmpty: true,
      title: i18n.translate(
        'xpack.logsExplorer.unifiedFieldList.useGroupedFields.smartFieldsLabel',
        {
          defaultMessage: 'Smart fields',
        }
      ),
    },
  },
];
