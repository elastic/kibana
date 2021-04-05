/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, RunFn } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import { AxiosError } from 'axios';
import bluebird from 'bluebird';
import { EventFilterGenerator } from '../../../common/endpoint/data_generators/event_filter_generator';
import { EXCEPTION_LIST_ITEM_URL } from '../../../../lists/common/constants';

export const cli = () => {
  run(createEventFilters, {
    description: 'Load Endpoint Event Filters',
    flags: {
      string: ['kibana'],
      default: {
        count: 10,
        kibana: 'http://elastic:changeme@localhost:5601',
      },
      help: `
        --count            Number of event filters to create. Default: 10
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@localhost:5601
      `,
    },
  });
};

class EventFilterDataLoaderError extends Error {
  constructor(message: string, public readonly meta: unknown) {
    super(message);
  }
}

const handleAxiosHttpError = (err: AxiosError): never => {
  let message = err.message;

  if (err.response) {
    message = `${err.response.data.message} [ ${String(err.response.config.method).toUpperCase()} ${
      err.response.config.url
    } ]`;
  }
  throw new EventFilterDataLoaderError(message, err.toJSON());
};

const createEventFilters: RunFn = async ({ flags, log }) => {
  const eventGenerator = new EventFilterGenerator();
  const kbn = new KbnClient({ log, url: flags.kibana as string });

  await bluebird.map(
    Array.from({ length: (flags.count as unknown) as number }),
    () =>
      kbn
        .request({
          method: 'POST',
          path: EXCEPTION_LIST_ITEM_URL,
          body: eventGenerator.generate(),
        })
        .catch((e) => handleAxiosHttpError(e)),
    { concurrency: 10 }
  );

  // touch the exception lists api so the list type can be created
  // FIXME: do we need this?
  // try {
  //   await kbn.request({
  //     method: 'GET',
  //     path: EXCEPTION_LIST_ITEM_URL,
  //     query: { id: '1' },
  //   });
  // } catch (e) {
  //   handleAxiosHttpError(e);
  // }

  log.write(JSON.stringify(eventGenerator.generate(), null, 2));
};
