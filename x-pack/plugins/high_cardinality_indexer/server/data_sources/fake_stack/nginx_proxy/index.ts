import { GeneratorFunction, Doc } from '../../../types';
import { createStartupEvents } from './lib/events/startup';

let firstRun = true;

export const kibanaAssets = `${__dirname}/assets/nginx_proxy.ndjson`;

export const generateEvent: GeneratorFunction = (_config, schedule, _index, timestamp) => {
  let startupEvents: Doc[] = [];
  if (firstRun) {
    firstRun = false;
    startupEvents = createStartupEvents(schedule, timestamp);
  }
  return startupEvents;
};

