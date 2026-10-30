/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_CASE_STATUSES } from '@kbn/cases-plugin/common/utils/statuses';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { deleteAllCaseItems } from '../../../common/lib/api';
import {
  DUPLICATE,
  SETTINGS_WITH_CUSTOM_STATUSES,
  TRIAGE,
  customStatus,
  getSpaceSettings,
  putSpaceSettings,
} from './helpers';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('space settings', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('returns the three default statuses when the space saved none', async () => {
      const settings = await getSpaceSettings({ supertest });

      expect(settings.statuses.map(({ key }) => key)).to.eql(['open', 'in-progress', 'closed']);
      expect(settings.statuses.map(({ category }) => category)).to.eql([
        'not_started',
        'active',
        'done',
      ]);
    });

    it('saves a valid list and returns it on the next read', async () => {
      const saved = await putSpaceSettings({ supertest, settings: SETTINGS_WITH_CUSTOM_STATUSES });
      expect(saved).to.eql(SETTINGS_WITH_CUSTOM_STATUSES);

      const settings = await getSpaceSettings({ supertest });
      expect(settings).to.eql(SETTINGS_WITH_CUSTOM_STATUSES);
    });

    it('lets a custom status become the default of its category', async () => {
      const statuses = [
        ...DEFAULT_CASE_STATUSES.map((status) =>
          status.category === 'not_started' ? { ...status, isDefault: false } : status
        ),
        { ...TRIAGE, isDefault: true },
      ];

      await putSpaceSettings({ supertest, settings: { statuses } });

      const settings = await getSpaceSettings({ supertest });
      expect(
        settings.statuses.find(({ isDefault, category }) => isDefault && category === 'not_started')
          ?.key
      ).to.be('triage');
    });

    describe('rejects an invalid list', () => {
      it('without a default for every category', async () => {
        const body = await putSpaceSettings({
          supertest,
          settings: {
            statuses: DEFAULT_CASE_STATUSES.map((status) =>
              status.category === 'done' ? { ...status, isDefault: false } : status
            ),
          },
          expectedHttpCode: 400,
        });

        expect(body.message).to.contain('Choose exactly one default status for the done category.');
      });

      it('with a duplicate key', async () => {
        const body = await putSpaceSettings({
          supertest,
          settings: {
            statuses: [...DEFAULT_CASE_STATUSES, TRIAGE, { ...TRIAGE, label: 'Triage again' }],
          },
          expectedHttpCode: 400,
        });

        expect(body.message).to.contain('The key "triage" is used by more than one status.');
      });

      it('that deletes a saved status', async () => {
        await putSpaceSettings({ supertest, settings: SETTINGS_WITH_CUSTOM_STATUSES });

        const body = await putSpaceSettings({
          supertest,
          settings: { statuses: [...DEFAULT_CASE_STATUSES, TRIAGE] },
          expectedHttpCode: 400,
        });

        expect(body.message).to.contain('"Duplicate" cannot be deleted. Disable it instead.');
      });

      it('that moves a saved status to another category', async () => {
        await putSpaceSettings({ supertest, settings: SETTINGS_WITH_CUSTOM_STATUSES });

        const body = await putSpaceSettings({
          supertest,
          settings: {
            statuses: [...DEFAULT_CASE_STATUSES, TRIAGE, { ...DUPLICATE, category: 'active' }],
          },
          expectedHttpCode: 400,
        });

        expect(body.message).to.contain('The category of "Duplicate" cannot change.');
      });

      it('with a key outside the allowed characters', async () => {
        await putSpaceSettings({
          supertest,
          settings: {
            statuses: [
              ...DEFAULT_CASE_STATUSES,
              customStatus({ key: 'Needs Review', label: 'Needs review', category: 'active' }),
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('with more than 50 statuses', async () => {
        const extra = Array.from({ length: 48 }, (_, index) =>
          customStatus({ key: `status_${index}`, label: `Status ${index}`, category: 'active' })
        );

        await putSpaceSettings({
          supertest,
          settings: { statuses: [...DEFAULT_CASE_STATUSES, ...extra] },
          expectedHttpCode: 400,
        });
      });
    });
  });
};
