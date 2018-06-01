/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set, omit } from 'lodash';
import {
  KIBANA_STATS_TYPE,
  KIBANA_SETTINGS_TYPE,
  KIBANA_USAGE_TYPE,
} from '../../../common/constants';
import { KIBANA_REPORTING_TYPE } from '../../../../reporting/common/constants';
import { sourceKibana } from './source_kibana';

/*
 * Combine stats collected from different sources into a single bulk payload.
 *
 * The ES Bulk Data Format is an array with 2 objects:
 * - The first object is the header, it has a field for the action (index), and
 *   metadata of the document (_index, _type, _id).
 * - The second object is the actual document to index.
 *
 * NOTE: https://github.com/elastic/kibana/issues/12504 asks that plugins have
 * a way to register their own stats. It's not hard to move the stats collector
 * methods under the ownership of the plugins that want it, but this module's
 * behavior doesn't fit well with plugins registering their own stats. See the
 * abstraction leak comments in the code.
 *
 * This module should go away when stats are collected by a Kibana metricbeat moduleset.
 *  - Individual plugin operational stats can be added to the `/stats?extended` API response.
 *  - Individual plugin usage stats can go into a new API similar to the `_xpack/usage` API in ES.
 *  - Each plugin will have its own top-level property in the responses for these APIs.
 */
export function getCollectorTypesCombiner(kbnServer, config, _sourceKibana = sourceKibana) {
  return payload => {
    // default the item to [] to allow destructuring
    const findItem = type => payload.find(item => get(item, '[0].index._type') === type) || [];

    // kibana usage and stats
    let statsResult;
    const [ statsHeader, statsPayload ] = findItem(KIBANA_STATS_TYPE);
    const [ reportingHeader, reportingPayload ] = findItem(KIBANA_REPORTING_TYPE);

    // sourceKibana uses "host" from the kibana stats payload
    const host = get(statsPayload, 'host');
    const kibana = _sourceKibana(kbnServer, config, host);

    if (statsHeader && statsPayload) {
      const [ usageHeader, usagePayload ] = findItem(KIBANA_USAGE_TYPE);
      const kibanaUsage = (usageHeader && usagePayload) ? usagePayload : null;
      const reportingUsage = (reportingHeader && reportingPayload) ? reportingPayload : null; // this is an abstraction leak
      statsResult = [
        statsHeader,
        {
          ...omit(statsPayload, 'host'), // remove the temp host field
          kibana,
        }
      ];
      if (kibanaUsage) {
        set(statsResult, '[1].usage', kibanaUsage);
      }
      if (reportingUsage) {
        set(statsResult, '[1].usage.xpack.reporting', reportingUsage); // this is an abstraction leak
      }
    }

    // kibana settings
    let settingsResult;
    const [ settingsHeader, settingsPayload ] = findItem(KIBANA_SETTINGS_TYPE);
    if (settingsHeader && settingsPayload) {
      settingsResult = [
        settingsHeader,
        {
          ...settingsPayload,
          kibana
        }
      ];
    }

    // return new payload with the combined data
    // adds usage data to stats data
    // strips usage out as a top-level type
    const result = [ statsResult, settingsResult ];

    // remove result items that are undefined
    return result.filter(Boolean);
  };
}
