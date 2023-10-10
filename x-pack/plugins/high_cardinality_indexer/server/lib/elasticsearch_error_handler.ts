import { Client } from '@elastic/elasticsearch';
import { startsWith } from 'lodash';
import { ElasticSearchService } from '../types';
import { logger } from './logger';

const ERROR_MESSAGES = [
  'getaddrinfo ENOTFOUND',
  'connect ECONNREFUSED',
  'Client network socket disconnected'
];

export const elasticsearchErrorHandler = (service: ElasticSearchService, client: Client, ignoreOtherErrors = false) => (error: Error) => {
  if (ERROR_MESSAGES.some((msg) => startsWith(error.message, msg))) {
    logger.info('Connection failed... trying again in 10 seconds');
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        service(client).then(resolve).catch(reject);
      }, 10000);
    });
  }
  logger.error(error.message);
  if (!ignoreOtherErrors) {
    throw error;
  } else {
    return error;
  }
};
