/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { parseKID } from '../../common/kid';

export const validateTagId = (id: string) => {
  if (typeof id !== 'string') throw Boom.badRequest('ID must be a string');
  if (id.length < 10) throw Boom.badRequest('ID is too short.');
  if (id.length > 256) throw Boom.badRequest('ID is too long.');
};

export const validateTagIds = (ids: string[]) => {
  if (!Array.isArray(ids)) throw Boom.badRequest('Expected tags IDs to be an array.');
  ids.forEach(validateTagId);
};

export const validateKID = (kid: string) => parseKID(kid);

export const validateTagTitle = (title: string) => {
  if (typeof title !== 'string') throw Boom.badRequest('Tag title must be a string');
  if (title.length < 1) throw Boom.badRequest('Tag title is too short.');
  if (title.length > 64) throw Boom.badRequest('Tag title is too long.');
};

export const validateTagDescription = (description: string) => {
  if (typeof description !== 'string') throw Boom.badRequest('Tag description must be a string');
  if (description.length > 16e3) throw Boom.badRequest('Tag description is too long.');
};

const HEX_CHARS = '0123456789abcdef';

/**
 * Verifies that tag color is in RGB HEX color format. The color should be a
 * hash followed by exactly 6 HEX digits. Alpha channels and short notation 3
 * digit colors are not supported.
 *
 * @param color RGB color in HEX format.
 */
export const validateTagColor = (color: string) => {
  if (!color) return '';

  if (typeof color !== 'string') throw Boom.badRequest('Expected color to be a string.');
  if (color[0] !== '#') throw Boom.badRequest('Expected color to start with a hash.');
  if (color.length !== 7) throw Boom.badRequest('Expected color to be 6-digit HEX string.');

  color = color.toLocaleLowerCase();

  for (let i = 1; i < color.length; i++) {
    const char = color[i];
    if (HEX_CHARS.indexOf(char) === -1) throw Boom.badRequest('Invalid digit in tag color.');
  }
};

export const validatePerPage = (perPage: number) => {
  if (typeof perPage !== 'number')
    throw Boom.badRequest('Expected perPage parameter to be a number');
  if (perPage < 1) throw Boom.badRequest('Too few results per page.');
  if (perPage > 100) throw Boom.badRequest('Too many requests per page.');
  if (perPage !== Math.round(perPage)) throw Boom.badRequest('Invalid perPage parameter.');
};

export const validatePage = (page: number) => {
  if (typeof page !== 'number') throw Boom.badRequest('Expected page parameter to be a number');
  if (page < 1 || page > 1000) throw Boom.badRequest('Invalid page.');
  if (page !== Math.round(page)) throw Boom.badRequest('Invalid page parameter.');
};
