/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorStatesQuery = gql`
  query MonitorStates {
    monitorStates: getMonitorStates {
      monitor_id
      state {
        agent {
          id
        }
        checks {
          agent {
            id
          }
          monitor {
            ip
            status
          }
          observer {
            geo {
              name
              location {
                lat
                lon
              }
            }
          }
          timestamp
        }
        geo {
          name
          location {
            lat
            lon
          }
        }
        observer {
          geo {
            name
            location {
              lat
              lon
            }
          }
        }
        monitor {
          id
          name
          status
          type
        }
        summary {
          up
          down
          geo {
            name
            location {
              lat
              lon
            }
          }
        }
        url {
          full
          scheme
        }
        timestamp
      }
    }
  }
`;
