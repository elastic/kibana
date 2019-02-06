/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Chance from 'chance'; // eslint-disable-line
// @ts-ignore
import request from 'request';
import uuidv4 from 'uuid/v4';
import { configBlockSchemas } from 'x-pack/plugins/beats_management/common/config_schemas';
import { BeatTag } from '../common/domain_types';
import { compose } from '../public/lib/compose/scripts';
const args = process.argv.slice(2);
const chance = new Chance();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
const enroll = async (kibanaURL: string, token: string) => {
  const beatId = uuidv4();

  if (!token) {
    token = kibanaURL;
    kibanaURL = 'http://localhost:5601';
  }

  await request({
    url: `${kibanaURL}/api/beats/agent/${beatId}`,
    method: 'POST',
    headers: {
      'kbn-xsrf': 'xxx',
      'kbn-beats-enrollment-token': token,
    },
    body: JSON.stringify({
      type: Math.random() >= 0.5 ? 'filebeat' : 'metricbeat',
      host_name: `${chance.word()}.local`,
      name: chance.word(),
      version: '6.7.0',
    }),
  });
};

const start = async (
  kibanaURL: string,
  numberOfBeats = 10,
  maxNumberOfTagsPerBeat = 2,
  maxNumberOfConfigsPerTag = 4
) => {
  try {
    const libs = compose(kibanaURL);
    // tslint:disable-next-line
    console.error(`Enrolling ${numberOfBeats} fake beats...`);

    const enrollmentTokens = await libs.tokens.createEnrollmentTokens(numberOfBeats);

    Promise.all(enrollmentTokens.map(token => enroll(kibanaURL, token)));
    await sleep(2000);
    // tslint:disable-next-line
    console.error(`${numberOfBeats} fake beats are enrolled`);
    const beats = await libs.beats.getAll();

    // tslint:disable-next-line
    console.error(`Creating tags, configs, and assigning them...`);
    beats.forEach(async beat => {
      const tags = await Promise.all(
        [...Array(maxNumberOfTagsPerBeat)].map(async () => {
          return await libs.tags.upsertTag({
            name: chance.word(),
            color: getRandomColor(),
            hasConfigurationBlocksTypes: [] as string[],
          } as BeatTag);
        })
      );
      await libs.beats.assignTagsToBeats(
        tags.map((tag: any) => ({
          beatId: beat.id,
          tag: tag.id,
        }))
      );

      tags.map(async (tag: any) => {
        return await libs.configBlocks.upsert(
          [...Array(maxNumberOfConfigsPerTag)].map(
            () =>
              ({
                type: configBlockSchemas[Math.floor(Math.random())].id,
                description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sint ista Graecorum; 
Nihil ad rem! Ne sit sane; Quod quidem nobis non saepe contingit. 
Duo Reges: constructio interrete. Itaque his sapiens semper vacabit.`.substring(
                  0,
                  Math.floor(Math.random() * (0 - 115 + 1))
                ),
                tag: tag.id,
                last_updated: new Date(),
                config: {},
              } as any)
          )
        );
      });
    });
  } catch (e) {
    if (e.response && e.response.data && e.response.message) {
      // tslint:disable-next-line
      console.error(e.response.data.message);
    } else if (e.response && e.response.data && e.response.reason) {
      // tslint:disable-next-line
      console.error(e.response.data.reason);
    } else if (e.code) {
      // tslint:disable-next-line
      console.error(e.code);
    } else {
      // tslint:disable-next-line
      console.error(e);
    }
  }
};

// @ts-ignore
start(...args);
