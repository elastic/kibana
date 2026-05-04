/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/**/index.ts',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/**/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/**/*.stories.tsx',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/jest.config.js',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/storybook_decorator.tsx',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/.storybook/**',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/__fixtures__/**',
    '!<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/target/**',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/jest\\.config\\.js',
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/storybook_decorator\\.tsx',
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/\\.storybook/',
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/__fixtures__/',
    '<rootDir>/x-pack/solutions/observability/packages/kbn-sigevents/.*\\.stories\\.tsx$',
  ],
};
