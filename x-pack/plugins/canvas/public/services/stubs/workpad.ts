/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

// @ts-expect-error
import { getDefaultWorkpad } from '../../state/defaults';
import { WorkpadService } from '../workpad';
import { getId } from '../../lib/get_id';
import { CanvasTemplate } from '../../../types';

const promiseTimeout = (time: number) => () => new Promise((resolve) => setTimeout(resolve, time));
const getName = () => {
  const lorem = 'Lorem ipsum dolor sit amet consectetur adipiscing elit Fusce lobortis aliquet arcu ut turpis duis'.split(
    ' '
  );
  return [1, 2, 3].map(() => lorem[Math.floor(Math.random() * lorem.length)]).join(' ');
};

const randomDate = (
  start: Date = moment().toDate(),
  end: Date = moment().subtract(7, 'days').toDate()
) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

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

export const getSomeWorkpads = (count = 3) =>
  Array.from({ length: count }, () => ({
    '@created': randomDate(
      moment().subtract(3, 'days').toDate(),
      moment().subtract(10, 'days').toDate()
    ),
    '@timestamp': randomDate(),
    id: getId('workpad'),
    name: getName(),
  }));

export const findSomeWorkpads = (count = 3, timeout = 2000) => (_term: string) => {
  return Promise.resolve()
    .then(promiseTimeout(timeout))
    .then(() => ({
      total: count,
      workpads: getSomeWorkpads(count),
    }));
};

export const findNoWorkpads = (timeout = 2000) => (_term: string) => {
  return Promise.resolve()
    .then(promiseTimeout(timeout))
    .then(() => ({
      total: 0,
      workpads: [],
    }));
};

export const findSomeTemplates = (timeout = 2000) => () => {
  return Promise.resolve()
    .then(promiseTimeout(timeout))
    .then(() => getSomeTemplates());
};

export const findNoTemplates = (timeout = 2000) => () => {
  return Promise.resolve()
    .then(promiseTimeout(timeout))
    .then(() => getNoTemplates());
};

export const getNoTemplates = () => ({ templates: [] });
export const getSomeTemplates = () => ({ templates });

export const workpadService: WorkpadService = {
  get: (id: string) => Promise.resolve({ ...getDefaultWorkpad(), id }),
  findTemplates: findNoTemplates(),
  create: (workpad) => Promise.resolve(workpad),
  createFromTemplate: (_templateId: string) => Promise.resolve(getDefaultWorkpad()),
  find: findNoWorkpads(),
  remove: (id: string) => Promise.resolve(),
};
