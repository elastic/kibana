/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';

export const createGetPingsQuery = (
  sort: UMPingSortDirectionArg = 'desc',
  size: number = 100
) => gql`
  {
    pings: allPings(sort: "${sort}", size: ${size}) {
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
