import { set } from 'lodash';
import { Moment } from 'moment';
import { MONGODB } from '../../../common/constants';

export function createBaseEvent(timestamp: Moment, host: string, context: string, component: string, message: string, level?: 'ERROR' | 'INFO', database?: string, collection?: string, action?: string) {
  const event = {
    namespace: MONGODB,
    '@timestamp': timestamp.toISOString(),
    host: { name: host },
    mongodb: {
      context,
      component,
    },
    log: {
      level: level || 'INFO',
      logger: MONGODB,
    },
    message,
    tags: [`infra:${MONGODB}`],
  };

  if (database) {
    set(event, 'mongodb.database', database);
  }

  if (collection) {
    set(event, 'mongodb.collection', collection);
  }

  if (action) {
    set(event, 'mongodb.action', action);
  }

  return event;
}
