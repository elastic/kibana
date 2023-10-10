import { Moment } from 'moment';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';

export function createStartupEvents(timestamp: Moment) {
  return MESSAGE_PROCESSOR_HOSTS.map((host) => (createBaseEvent(timestamp, 'INFO', host, 'Message processor starting up...')));
}
