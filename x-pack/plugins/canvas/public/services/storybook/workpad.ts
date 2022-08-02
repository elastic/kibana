/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { action } from '@storybook/addon-actions';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { getId } from '../../lib/get_id';
// @ts-expect-error
import { getDefaultWorkpad } from '../../state/defaults';

import { StorybookParams } from '.';
import { CanvasWorkpadService } from '../workpad';

import * as stubs from '../stubs/workpad';

export {
  findNoTemplates,
  findNoWorkpads,
  findSomeTemplates,
  getNoTemplates,
  getSomeTemplates,
} from '../stubs/workpad';

type CanvasWorkpadServiceFactory = PluginServiceFactory<CanvasWorkpadService, StorybookParams>;

const TIMEOUT = 500;
const promiseTimeout = (time: number) => () => new Promise((resolve) => setTimeout(resolve, time));

const { findNoTemplates, findNoWorkpads, findSomeTemplates, importWorkpad } = stubs;

const getRandomName = () => {
  const lorem =
    'Lorem ipsum dolor sit amet consectetur adipiscing elit Fusce lobortis aliquet arcu ut turpis duis'.split(
      ' '
    );
  return [1, 2, 3].map(() => lorem[Math.floor(Math.random() * lorem.length)]).join(' ');
};

const getRandomDate = (
  start: Date = moment().toDate(),
  end: Date = moment().subtract(7, 'days').toDate()
) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

export const getSomeWorkpads = (count = 3) =>
  Array.from({ length: count }, () => ({
    '@created': getRandomDate(
      moment().subtract(3, 'days').toDate(),
      moment().subtract(10, 'days').toDate()
    ),
    '@timestamp': getRandomDate(),
    id: getId('workpad'),
    name: getRandomName(),
  }));

export const findSomeWorkpads =
  (count = 3, useStaticData = false, timeout = TIMEOUT) =>
  (_term: string) => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => ({
        total: count,
        workpads: useStaticData ? stubs.getSomeWorkpads(count) : getSomeWorkpads(count),
      }));
  };

export const workpadServiceFactory: CanvasWorkpadServiceFactory = ({
  workpadCount,
  hasTemplates,
  useStaticData,
}) => ({
  get: (id: string) => {
    action('workpadService.get')(id);
    return Promise.resolve({ ...getDefaultWorkpad(), id });
  },
  resolve: (id: string) => {
    action('workpadService.resolve')(id);
    return Promise.resolve({ outcome: 'exactMatch', workpad: { ...getDefaultWorkpad(), id } });
  },
  findTemplates: () => {
    action('workpadService.findTemplates')();
    return (hasTemplates ? findSomeTemplates() : findNoTemplates())();
  },
  import: (workpad) => {
    action('workpadService.import')(workpad);
    return importWorkpad(workpad);
  },
  create: (workpad) => {
    action('workpadService.create')(workpad);
    return Promise.resolve(workpad);
  },
  createFromTemplate: (templateId: string) => {
    action('workpadService.createFromTemplate')(templateId);
    return Promise.resolve(getDefaultWorkpad());
  },
  find: (term: string) => {
    action('workpadService.find')(term);
    return (workpadCount ? findSomeWorkpads(workpadCount, useStaticData) : findNoWorkpads())(term);
  },
  remove: (id: string) => {
    action('workpadService.remove')(id);
    return Promise.resolve();
  },
  update: (id, workpad) => {
    action('worpadService.update')(workpad, id);
    return Promise.resolve();
  },
  updateWorkpad: (id, workpad) => {
    action('workpadService.updateWorkpad')(workpad, id);
    return Promise.resolve();
  },
  updateAssets: (id, assets) => {
    action('workpadService.updateAssets')(assets, id);
    return Promise.resolve();
  },
  getRuntimeZip: (workpad) =>
    Promise.resolve(new Blob([JSON.stringify(workpad)], { type: 'application/json' })),
});
