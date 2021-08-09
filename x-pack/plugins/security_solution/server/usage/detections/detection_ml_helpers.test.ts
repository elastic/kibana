/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initialMlJobsUsage, updateMlJobsUsage } from './detection_ml_helpers';

describe('Security Machine Learning usage metrics', () => {
  describe('Updates metrics with job information', () => {
    it('Should update ML total for elastic rules', async () => {
      const initialUsage = initialMlJobsUsage;
      const isElastic = true;
      const isEnabled = true;

      const updatedUsage = updateMlJobsUsage({ isElastic, isEnabled }, initialUsage);

      expect(updatedUsage).toEqual(
        expect.objectContaining({
          custom: {
            disabled: 0,
            enabled: 0,
          },
          elastic: {
            disabled: 0,
            enabled: 1,
          },
        })
      );
    });

    it('Should update ML total for custom rules', async () => {
      const initialUsage = initialMlJobsUsage;
      const isElastic = false;
      const isEnabled = true;

      const updatedUsage = updateMlJobsUsage({ isElastic, isEnabled }, initialUsage);

      expect(updatedUsage).toEqual(
        expect.objectContaining({
          custom: {
            disabled: 0,
            enabled: 1,
          },
          elastic: {
            disabled: 0,
            enabled: 0,
          },
        })
      );
    });

    it('Should update ML total for both elastic and custom rules', async () => {
      const initialUsage = initialMlJobsUsage;

      let updatedUsage = updateMlJobsUsage({ isElastic: true, isEnabled: true }, initialUsage);
      updatedUsage = updateMlJobsUsage({ isElastic: false, isEnabled: true }, updatedUsage);

      expect(updatedUsage).toEqual(
        expect.objectContaining({
          custom: {
            disabled: 0,
            enabled: 1,
          },
          elastic: {
            disabled: 0,
            enabled: 1,
          },
        })
      );
    });
  });
});
