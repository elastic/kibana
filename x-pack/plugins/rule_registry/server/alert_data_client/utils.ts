/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface BuildAlertsSearchQuery {
  alertId: string;
  index: string;
  from?: string;
  to?: string;
  size?: number;
}

export const buildAlertsSearchQuery = ({
  alertId,
  index,
  from,
  to,
  size,
}: BuildAlertsSearchQuery) => ({
  index,
  body: {
    size,
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: {
                match: {
                  _id: alertId,
                },
              },
              minimum_should_match: 1,
            },
          },
          {
            range: {
              '@timestamp': {
                gt: from,
                lte: to,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
  },
});

interface BuildAlertsUpdateParams {
  ids: string[];
  index: string;
  status: string;
}

export const buildAlertsUpdateParameters = ({ ids, index, status }: BuildAlertsUpdateParams) => ({
  index,
  body: ids.flatMap((id) => [
    {
      update: {
        _id: id,
      },
    },
    {
      doc: { 'kibana.rac.alert.status': status },
    },
  ]),
});
