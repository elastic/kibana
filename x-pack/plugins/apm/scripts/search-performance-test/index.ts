/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
import axios from 'axios';
import datemath from '@elastic/datemath';
import { format, parse } from 'url';
import yargs from 'yargs/yargs';
import moment from 'moment';
import uuid from 'uuid/v4';
import { serviceInventoryToOverview } from './flows';
import { intervalToMs } from '../../../../../packages/elastic-apm-synthtrace/src/scripts/utils/interval_to_ms';

yargs(process.argv.slice(2))
  .command(
    '*',
    'Generate load for APM Kibana endpoints',
    (y) => {
      return y
        .option('kibanaUrl', {
          describe: 'URL to kibana, including authentication',
          demandOption: true,
          string: true,
        })
        .option('now', {
          describe: 'Current time',
          default: new Date().toISOString(),
          string: true,
        })
        .option('round', {
          describe: 'Whether to apply date rounding',
          default: false,
          boolean: true,
        })
        .option('window', {
          describe: 'Length of selected time range',
          default: '15m',
          string: true,
        })
        .option('step', {
          describe: 'Step size',
          string: true,
          default: '10s',
        })
        .option('duration', {
          describe: 'Duration of script run',
          string: true,
        })
        .option('offset', {
          describe: 'Comparison window offset',
          string: true,
        })
        .option('legacyUrls', {
          describe: 'Whether to use legacy URLs (/api/apm)',
          boolean: true,
          default: true,
        })
        .option('tag', {
          describe: 'Tags for this performance run',
          string: true,
        })
        .option('users', {
          describe: 'Number of concurrent users',
          number: true,
          default: 1,
        });
    },
    async (argv) => {
      const testRunId = uuid();

      console.log('Starting test run', testRunId, argv);

      agent.start({
        serviceName: 'search-performance-test',
        globalLabels: {
          performance_test_run_id: testRunId,
          performance_test_run_round: argv.round,
          performance_test_run_tag: argv.tag,
          performance_test_run_window: argv.window,
          performance_test_run_users: argv.users,
        },
      });

      const now = datemath.parse(String(argv.now))!.valueOf();
      const step = intervalToMs(argv.step);
      const window = intervalToMs(argv.window);

      const { auth, ...rest } = parse(argv.kibanaUrl);

      const baseUrl = format(rest);

      if (argv.duration) {
        setTimeout(() => {
          process.exit(0);
        }, intervalToMs(argv.duration));
      }

      axios.defaults.headers['kbn-xsrf'] = 'foo';
      axios.defaults.auth = auth
        ? {
            username: auth.split(':')[0],
            password: auth.split(':')[1],
          }
        : undefined;

      await axios.post(
        baseUrl +
          `api/console/proxy?path=${encodeURIComponent(
            '*/_cache/clear?request=true'
          )}&method=POST`
      );

      let lastRefresh = now;

      async function clearCacheForWriteIndex() {
        const writeIndexResponse = await axios.post(
          baseUrl +
            `api/console/proxy?path=${encodeURIComponent(
              'apm-*/_search'
            )}&method=POST`,
          {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: new Date(now - window).toISOString(),
                        lt: new Date(now).toISOString(),
                      },
                    },
                  },
                ],
              },
            },
            size: 1,
            sort: {
              '@timestamp': 'desc',
            },
          }
        );

        const writeIndex = writeIndexResponse.data.hits.hits[0]._index;

        console.log('Clearing request cache for write index', writeIndex);
        await axios.post(
          baseUrl +
            `api/console/proxy?path=${encodeURIComponent(
              writeIndex + '/_cache/clear'
            )}&method=POST`
        );
      }
      const refreshInterval = 5 * 1000;

      axios.defaults.baseURL = baseUrl + (argv.legacyUrls ? 'api' : 'internal');

      async function simulateUser(time: number) {
        let start = moment(time - window);
        let end = moment(time);

        if (time - lastRefresh > refreshInterval) {
          lastRefresh = time;
          await clearCacheForWriteIndex();
        }

        if (argv.round) {
          if (window > 12 * 60 * 60 * 1000) {
            start = moment(start).endOf('hour').add(1, 'ms');
            end = moment(end).endOf('hour').add(1, 'ms');
          } else {
            start = moment(start).endOf('minute').add(1, 'ms');
            end = moment(end).endOf('minute').add(1, 'ms');
          }
        }

        console.log(start.toISOString(), end.toISOString());

        await serviceInventoryToOverview({
          start: start.toISOString(),
          end: end.toISOString(),
          offset: argv.offset,
        });

        await simulateUser(time + step);
      }

      process.on('exit', () => {
        agent.flush(() => {
          process.exit();
        });
      });

      new Array(argv.users).fill(undefined).forEach(() => {
        const delay: number = 500 + Math.random() * 2000;
        setTimeout(() => {
          simulateUser(now + delay);
        }, delay);
      });
    }
  )
  .parse();
