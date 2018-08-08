/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { ML_JOB_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';
import { EVENT_RATE_COUNT_FIELD } from 'plugins/ml/jobs/new_job/simple/components/constants/general';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.filter('filterAggTypes', function () {
  return (aggTypes, field) => {
    return aggTypes.filter(type => {
      if (field.id === EVENT_RATE_COUNT_FIELD) {
        if(type.isCountType) {
          return true;
        }
      } else {
        if(!type.isCountType) {
          if (field.mlType === ML_JOB_FIELD_TYPES.KEYWORD || field.mlType === ML_JOB_FIELD_TYPES.IP) {
            // keywords and ips can't have the full list of aggregations.
            // currently limited to Distinct count only
            if (type.isAggregatableStringType) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
      return false;
    });
  };
});
