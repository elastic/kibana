/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';
import moment from 'moment';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';

interface PingsQueryOptions {
  monitorId?: string;
  sort?: UMPingSortDirectionArg;
  size?: number;
  status?: string;
  dateRangeStart: number;
  dateRangeEnd: number;
}

export const createGetPingsQuery = ({
  monitorId = '',
  sort = 'desc',
  size = 100,
  status = '',
  dateRangeStart = moment()
    .subtract(1, 'day')
    .valueOf(),
  dateRangeEnd = moment.now(),
}: PingsQueryOptions) => gql`
  {
    pings: allPings(sort: "${sort}", size: ${size}, monitorId: "${monitorId}", status: "${status}", dateRangeStart: "${dateRangeStart}", dateRangeEnd: "${dateRangeEnd}") {
      timestamp
      beat {
        name
        timezone
      }
      host {
        architecture
        id
        ip
        mac
        name
        os {
          family
          kernel
          platform
          version
        }
      }
      http {
        response {
          status_code
        }
      }
      monitor {
        id
        ip
        name
        scheme
        status
        type
      }
    }
  }
`;
