/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const getMonitorListQuery = gql`
  query MonitorList($start: UnsignedInteger, $end: UnsignedInteger) {
    monitorStatus: getMonitors(start: $start, end: $end) {
      monitors {
        key {
          id
          port
        }
        ping {
          timestamp
          monitor {
            status
            type
            host
            ip
            duration {
              us
            }
          }
        }
        upSeries {
          x
          y
        }
        downSeries {
          x
          y
        }
      }
    }
  }
`;
