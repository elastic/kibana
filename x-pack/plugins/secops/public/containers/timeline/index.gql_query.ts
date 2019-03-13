/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const timelineQuery = gql`
  query GetTimelineQuery(
    $sourceId: ID!
    $pagination: PaginationInput!
    $sortField: SortField!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      Events(pagination: $pagination, sortField: $sortField, filterQuery: $filterQuery) {
        totalCount
        pageInfo {
          endCursor {
            value
            tiebreaker
          }
          hasNextPage
        }
        edges {
          node {
            _id
            _index
            timestamp
            event {
              action
              severity
              module
              category
              id
              dataset
            }
            host {
              id
              name
              ip
            }
            source {
              ip
              port
            }
            destination {
              ip
              port
            }
            geo {
              region_name
              country_iso_code
            }
            suricata {
              eve {
                proto
                flow_id
                alert {
                  signature
                  signature_id
                }
              }
            }
            network {
              transport
            }
            http {
              version
              request {
                method
                body {
                  bytes
                  content
                }
                referrer
              }
              response {
                status_code
                body {
                  bytes
                  content
                }
              }
            }
            url {
              original
              domain
              username
              password
            }
            user {
              name
            }
            process {
              pid
              name
              ppid
              args
              executable
              title
              working_directory
            }
            zeek {
              session_id
              connection {
                local_resp
                local_orig
                missed_bytes
                state
                history
              }
              notice {
                suppress_for
                msg
                note
                sub
                dst
                dropped
                peer_descr
              }
              dns {
                AA
                qclass_name
                RD
                qtype_name
                rejected
                qtype
                query
                trans_id
                qclass
                RA
                TC
              }
              http {
                resp_mime_types
                trans_depth
                status_msg
                resp_fuids
                tags
              }
              files {
                session_ids
                timedout
                local_orig
                tx_host
                source
                is_orig
                overflow_bytes
                sha1
                duration
                depth
                analyzers
                mime_type
                rx_host
                total_bytes
                fuid
                seen_bytes
                missing_bytes
                md5
              }
              ssl {
                cipher
                established
                resumed
                version
              }
            }
          }
        }
      }
    }
  }
`;
