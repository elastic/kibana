import { GeneratorFunction, Doc } from '../../../types';
import { createStartupEvents } from './lib/events/startup';

let firstRun = true;

export const kibanaAssets = `${__dirname}/assets/mongodb.ndjson`;

export const generateEvent: GeneratorFunction = (_config, _schedule, _index, timestamp) => {
  let startupEvents: Doc[] = [];
  if (firstRun) {
    firstRun = false;
    startupEvents = createStartupEvents(_schedule, timestamp);
  }
  return startupEvents;
};
