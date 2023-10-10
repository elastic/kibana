import { sample, random, xor, sum } from 'lodash';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';
import { badHosts } from './bad_host';
import { EventFunction } from '../../../../../types';
import { createLatencyHistogram } from './create_latency_histogram';

export const good: EventFunction = (schedule, timestamp) => {
  const hosts = schedule.template === 'bad' ? xor(MESSAGE_PROCESSOR_HOSTS, badHosts) : MESSAGE_PROCESSOR_HOSTS;
  const host = sample(hosts) as string;
  const latency = createLatencyHistogram(random(10, 1000), { min: 10, max: 100 });
  const accepted = sum(latency.counts);
  const processed = accepted;
  const message = `Processed ${processed} messages out of ${accepted}`;
  return [createBaseEvent(timestamp, 'INFO', host, message, sum(latency.counts), sum(latency.counts), latency, 'success')];

};
