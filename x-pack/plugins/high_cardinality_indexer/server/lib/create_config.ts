import { FAKE_LOGS } from "../constants";
import { Config, ConfigRT, DatasetRT, Schedule, PartialConfig, PartialConfigRT } from "../types";
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import fs from 'fs';
import { parse } from 'yaml';

const EVENTS_PER_CYCLE = process.env.EVENTS_PER_CYCLE && parseInt(process.env.EVENTS_PER_CYCLE) || 1;
const PAYLOAD_SIZE = process.env.PAYLOAD_SIZE && parseInt(process.env.PAYLOAD_SIZE, 10) || 10000;
const CONCURRENCY = process.env.CONCURRENCY && parseInt(process.env.CONCURRENCY, 10) || 5;
const SERVERLESS = process.env.SERVERLESS === '1' || false;
const INDEX_INTERVAL = process.env.INDEX_INTERVAL && parseInt(process.env.INDEX_INTERVAL, 10) || 60000;
const DATASET = process.env.DATASET || FAKE_LOGS;
const ES_USER = process.env.ELASTICSEARCH_USERNAME ? process.env.ELASTICSEARCH_USERNAME : SERVERLESS ? 'elastic_serverless' : 'elastic';
const ES_PASS = process.env.ELASTICSEARCH_PASSWORD || 'changeme';
const ES_API_KEY = process.env.ELASTICSEARCH_API_KEY || '';
const SKIP_KIBANA_USER = SERVERLESS ? true : process.env.SKIP_KIBANA_USER === '1' || false;
const INSTALL_KIBANA_ASSETS = SERVERLESS ? false : process.env.INSTALL_KIBANA_ASSETS === '1' || false;
const DELAY_IN_MINUTES = process.env.DELAY_IN_MINUTES && parseInt(process.env.DELAY_IN_MINUTES, 10) || 0;
const DELAY_EVERY_MINUTES = process.env.DELAY_EVERY_MINUTES && parseInt(process.env.DELAY_EVERY_MINUTES, 10) || 5;
const LOOKBACK = process.env.LOOKBACK || false;
const KIBANA_URL = process.env.KIBANA_URL || 'http://127.0.0.1:5601';
const KIBANA_USER = process.env.KIBANA_USERNAME || 'elastic';
const KIBANA_PASS = process.env.KIBANA_PASSWORD || 'changeme';
const ELASTICSEARCH_HOSTS = process.env.ELASTICSEARCH_HOSTS ? process.env.ELASTICSEARCH_HOSTS : SERVERLESS ? 'https://127.0.0.1:9200' : 'http://127.0.0.1:9200';
const EVENT_TEMPLATE = process.env.EVENT_TEMPLATE || 'good'; // good or bad
const REDUCE_WEEKEND_TRAFFIC_BY = process.env.REDUCE_WEEKEND_TRAFFIC_BY && parseFloat(process.env.REDUCE_WEEKEND_TRAFFIC_BY) || 0; // good or bad
const CONFIG = process.env.CONFIG;

async function readConfig(filePath: string): Promise<PartialConfig> {
  const data = await fs.promises.readFile(filePath);
  const decodedPartialConfig = PartialConfigRT.decode(parse(data.toString()));
  if (isLeft(decodedPartialConfig)) {
    throw new Error(`Could not validate config: ${PathReporter.report(decodedPartialConfig).join("\n")}`);
  }
  return decodedPartialConfig.right;
}

export async function createConfig() {
  const schedule: Schedule = {
    template: EVENT_TEMPLATE,
    start: LOOKBACK || 'now',
    end: false
  };

  if (DELAY_IN_MINUTES) {
    schedule.delayInMinutes = DELAY_IN_MINUTES;
  }

  if (DELAY_EVERY_MINUTES) {
    schedule.delayEveryMinutes = DELAY_EVERY_MINUTES;
  }

  const decodedDataset = DatasetRT.decode(DATASET);
  if (isLeft(decodedDataset)) {
    throw new Error(`Could not validate "DATASET": ${PathReporter.report(decodedDataset).join("\n")}`);
  }

  const partialConfig = CONFIG && (await readConfig(CONFIG)) || {} as PartialConfig;

  const config: Config = {
    elasticsearch: {
      host: ELASTICSEARCH_HOSTS,
      username: ES_USER,
      password: ES_PASS,
      installKibanaUser: !SKIP_KIBANA_USER,
      apiKey: ES_API_KEY,
      ...(partialConfig.elasticsearch ?? {})
    },
    kibana: {
      host: KIBANA_URL,
      username: KIBANA_USER,
      password: KIBANA_PASS,
      installAssets: INSTALL_KIBANA_ASSETS,
      ...(partialConfig.kibana ?? {})
    },
    indexing: {
      dataset: decodedDataset.right,
      interval: INDEX_INTERVAL,
      eventsPerCycle: EVENTS_PER_CYCLE,
      payloadSize: PAYLOAD_SIZE,
      concurrency: CONCURRENCY,
      reduceWeekendTrafficBy: REDUCE_WEEKEND_TRAFFIC_BY,
      ...(partialConfig.indexing ?? {})
    },
    schedule: partialConfig.schedule ?? [schedule],
  };

  const decodedConfig = ConfigRT.decode(config);
  if (isLeft(decodedConfig)) {
    throw new Error(`Could not validate config: ${PathReporter.report(decodedConfig).join("\n")}`);
  }

  return decodedConfig.right;
}
