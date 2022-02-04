/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { PluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

// @ts-expect-error
import { getDefaultWorkpad, getExportedWorkpad } from '../../state/defaults';
import { CanvasWorkpadService } from '../workpad';
import { CanvasTemplate, CanvasWorkpad } from '../../../types';

type CanvasWorkpadServiceFactory = PluginServiceFactory<CanvasWorkpadService>;

export const TIMEOUT = 500;
export const promiseTimeout = (time: number) => () =>
  new Promise((resolve) => setTimeout(resolve, time));

const DAY = 86400000;
const JAN_1_2000 = 946684800000;

const getWorkpads = (count = 3) => {
  const workpads = [];
  for (let i = 0; i < count; i++) {
    workpads[i] = {
      ...getDefaultWorkpad(),
      name: `Workpad ${i}`,
      id: `workpad-${i}`,
      '@created': moment(JAN_1_2000 + DAY * i).toDate(),
      '@timestamp': moment(JAN_1_2000 + DAY * (i + 1)).toDate(),
    };
  }
  return workpads;
};

export const getSomeWorkpads = (count = 3) => getWorkpads(count);

export const findSomeWorkpads =
  (count = 3, timeout = TIMEOUT) =>
  (_term: string) => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => ({
        total: count,
        workpads: getSomeWorkpads(count),
      }));
  };

const templates: CanvasTemplate[] = [
  {
    id: 'test1-id',
    name: 'test1',
    help: 'This is a test template',
    tags: ['tag1', 'tag2'],
    template_key: 'test1-key',
  },
  {
    id: 'test2-id',
    name: 'test2',
    help: 'This is a second test template',
    tags: ['tag2', 'tag3'],
    template_key: 'test2-key',
  },
];

export const findNoWorkpads =
  (timeout = TIMEOUT) =>
  (_term: string) => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => ({
        total: 0,
        workpads: [],
      }));
  };

export const findSomeTemplates =
  (timeout = TIMEOUT) =>
  () => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => getSomeTemplates());
  };

export const findNoTemplates =
  (timeout = TIMEOUT) =>
  () => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => getNoTemplates());
  };

export const importWorkpad = (workpad: CanvasWorkpad) => Promise.resolve(workpad);
export const getNoTemplates = () => ({ templates: [] });
export const getSomeTemplates = () => ({ templates });

export const workpadServiceFactory: CanvasWorkpadServiceFactory = () => ({
  get: (id: string) => Promise.resolve({ ...getDefaultWorkpad(), id }),
  resolve: (id: string) =>
    Promise.resolve({ outcome: 'exactMatch', workpad: { ...getDefaultWorkpad(), id } }),
  findTemplates: findNoTemplates(),
  create: (workpad) => Promise.resolve(workpad),
  import: (workpad) => importWorkpad(workpad),
  createFromTemplate: (_templateId: string) => Promise.resolve(getDefaultWorkpad()),
  find: findNoWorkpads(),
  remove: (_id: string) => Promise.resolve(),
  update: (id, workpad) => Promise.resolve(),
  updateWorkpad: (id, workpad) => Promise.resolve(),
  updateAssets: (id, assets) => Promise.resolve(),
  getRuntimeZip: (workpad) =>
    Promise.resolve(new Blob([JSON.stringify(workpad)], { type: 'application/json' })),
});
