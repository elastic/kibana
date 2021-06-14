/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { config } from './config';
import { getDeprecationsFor } from '../../../../src/core/server/test_utils';

function applyDeprecations(settings?: Record<string, any>) {
  return getDeprecationsFor({ provider: config.deprecations!, settings, path: 'xpack.banners' });
}

describe('deprecations', () => {
  it('replaces xpack.banners.placement from "header" to "top"', () => {
    const { migrated } = applyDeprecations({
      placement: 'header',
    });
    expect(migrated.xpack.banners.placement).toBe('top');
  });
  it('logs a warning message about xpack.banners.placement renaming', () => {
    const { messages } = applyDeprecations({
      placement: 'header',
    });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "The \`header\` value for xpack.banners.placement has been replaced by \`top\`",
      ]
    `);
  });
  it('do not rename other placement values', () => {
    const { migrated, messages } = applyDeprecations({
      placement: 'disabled',
    });
    expect(migrated.xpack.banners.placement).toBe('disabled');
    expect(messages.length).toBe(0);
  });
});
