/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import _ from 'lodash';
import { uiModules } from 'ui/modules';

uiModules
  .get('xpack/watcher')
  .filter('moment', function (config) {
    return function (datetime) {
      const format = config.get('dateFormat');
      if (moment.isMoment(datetime)) return datetime.format(format);
      if (_.isDate(datetime)) return moment(datetime).format(format);
      return datetime;
    };
  });
