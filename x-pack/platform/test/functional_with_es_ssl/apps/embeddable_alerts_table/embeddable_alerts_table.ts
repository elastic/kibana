/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  FILTERS_FORM_ITEM_SUBJ,
  FILTERS_FORM_SUBJ,
  RULE_TAGS_FILTER_SUBJ,
  SOLUTION_SELECTOR_SUBJ,
} from '@kbn/response-ops-alerts-filters-form/constants';
import {
  NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ,
  SAVE_CONFIG_BUTTON_SUBJ,
} from '@kbn/embeddable-alerts-table-plugin/public/constants';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';

const DASHBOARD_PANEL_TEST_SUBJ = 'dashboardPanel';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'common',
    'home',
    'triggersActionsUI',
    'header',
    'ruleDetailsUI',
    'dashboard',
    'timePicker',
  ]);
  const browser = getService('browser');
  const security = getService('security');
  const retry = getService('retry');
  const find = getService('find');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const comboBox = getService('comboBox');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const toasts = getService('toasts');

  const createEsQueryRule = async (index: string, solution: 'stack' | 'observability') => {
    const name = `${solution}-rule`;
    const { body: createdRule } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        rule_type_id: `.es-query`,
        enabled: true,
        schedule: { interval: '5s' },
        consumer: solution === 'stack' ? 'stackAlerts' : 'logs',
        tags: [name],
        params: {
          searchConfiguration: {
            query: {
              query: '',
              language: 'kuery',
            },
            index,
          },
          timeField: 'timestamp',
          searchType: 'searchSource',
          timeWindowSize: 5,
          timeWindowUnit: 'h',
          threshold: [-1],
          thresholdComparator: '>',
          size: 1,
          aggType: 'count',
          groupBy: 'all',
          termSize: 5,
          excludeHitsFromPreviousRun: false,
          sourceFields: [],
        },
      })
      .expect(200);
    objectRemover.add(createdRule.id, 'rule', 'alerting');
    return createdRule;
  };

  const createSecurityRule = async (index: string) => {
    const { body: createdRule } = await supertest
      .post(`/api/detection_engine/rules`)
      .set('kbn-xsrf', 'foo')
      .send({
        type: 'query',
        filters: [],
        language: 'kuery',
        query: '_id: *',
        required_fields: [],
        data_view_id: index,
        author: [],
        false_positives: [],
        references: [],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        threat: [],
        max_signals: 100,
        name: 'security-rule',
        description: 'security-rule',
        tags: ['security-rule'],
        setup: '',
        license: '',
        interval: '5s',
        from: 'now-10m',
        to: 'now',
        actions: [],
        enabled: true,
        meta: {
          kibana_siem_app_url: 'http://localhost:5601/app/security',
        },
      })
      .expect(200);
    objectRemover.add(createdRule.id, 'rule', 'alerting');
    return createdRule;
  };

  const getSampleWebLogsDataView = async () => {
    const { body } = await supertest
      .post(`/api/content_management/rpc/search`)
      .set('kbn-xsrf', 'foo')
      .send({
        contentTypeId: 'index-pattern',
        query: { limit: 10 },
        version: 1,
      })
      .expect(200);
    return body.result.result.hits.find(
      (dataView: { attributes: { title: string } }) =>
        dataView.attributes.title === 'kibana_sample_data_logs'
    );
  };

  const getRuleSummary = async (ruleId: string) => {
    const { body: summary } = await supertest
      .get(`/internal/alerting/rule/${encodeURIComponent(ruleId)}/_alert_summary`)
      .expect(200);
    return summary;
  };

  // Failing: See https://github.com/elastic/kibana/issues/220807
  describe('Embeddable alerts panel', () => {
    before(async () => {
      await pageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });

      await pageObjects.home.addSampleDataSet('logs');
      const dataView = await getSampleWebLogsDataView();
      const [stackRule, observabilityRule, securityRule] = await Promise.all([
        createEsQueryRule(dataView.id, 'stack'),
        createEsQueryRule(dataView.id, 'observability'),
        createSecurityRule(dataView.id),
      ]);

      // Refresh to see the created rules
      await browser.refresh();
      await pageObjects.header.waitUntilLoadingHasFinished();

      // Wait for all rules to have created alerts
      const rulesAlerted: Record<string, boolean> = {
        [stackRule.id]: false,
        [observabilityRule.id]: false,
        [securityRule.id]: false,
      };

      await retry.try(async () => {
        const rulesWithoutAlerts = Object.entries(rulesAlerted)
          .filter(([_, alerted]) => !alerted)
          .map(([ruleId]) => ruleId);

        await Promise.all(
          rulesWithoutAlerts.map(async (ruleId) => {
            const summary = await getRuleSummary(ruleId);
            rulesAlerted[ruleId] = Object.keys(summary.alerts).length > 0;
          })
        );

        expect(Object.values(rulesAlerted).every((hasAlerts) => hasAlerts)).to.be(true);
      });

      await pageObjects.dashboard.gotoDashboardURL();
    });

    after(async () => {
      await pageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });

      await pageObjects.home.addSampleDataSet('logs');
      await objectRemover.removeAll();
    });

    describe('Config editor', () => {
      it('should show the solution picker when multiple solutions are available', async () => {
        await toasts.dismissIfExists();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Alerts');
        await testSubjects.existOrFail(SOLUTION_SELECTOR_SUBJ);
      });

      it('should ask for confirmation before resetting filters when switching solution', async () => {
        await find.clickByCssSelector(`button#observability`);
        await find.clickByCssSelector(`[data-test-subj=${FILTERS_FORM_ITEM_SUBJ}] button`);
        await find.clickByCssSelector(`button#ruleTags`);
        await testSubjects.click('comboBoxToggleListButton');
        const options = await comboBox.getOptions(RULE_TAGS_FILTER_SUBJ);
        await options[0].click();

        await testSubjects.click(SOLUTION_SELECTOR_SUBJ);
        await find.clickByCssSelector(`button#security`);

        expect(await find.byButtonText('Switch solution')).to.be.ok();
      });
    });

    for (const solution of ['stack', 'observability', 'security']) {
      describe(`with ${solution} role`, () => {
        const ruleName = `${solution}-rule`;

        before(async () => {
          await security.testUser.setRoles([`${solution}_alerting`]);
        });

        it(`should only be able to create panels with ${solution} rule types`, async () => {
          await pageObjects.dashboard.gotoDashboardURL();
          await toasts.dismissIfExists();
          await dashboardAddPanel.clickEditorMenuButton();
          await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Alerts');
          await retry.try(() => testSubjects.exists(FILTERS_FORM_SUBJ));
          if (solution === 'stack' || solution === 'observability') {
            await testSubjects.missingOrFail(SOLUTION_SELECTOR_SUBJ);
          }
          await find.clickByCssSelector(`[data-test-subj=${FILTERS_FORM_ITEM_SUBJ}] button`);
          await find.clickByCssSelector(`button#ruleTags`);
          await testSubjects.click('comboBoxToggleListButton');
          const options = await comboBox.getOptions(RULE_TAGS_FILTER_SUBJ);
          expect(options.length).to.equal(1);
          expect(await options[0].getVisibleText()).to.equal(ruleName);
          await options[0].click();
          // Dashboard warnings may appear above the save button
          await toasts.dismissIfExists();
          await testSubjects.click(SAVE_CONFIG_BUTTON_SUBJ);
          await retry.try(() => testSubjects.exists(DASHBOARD_PANEL_TEST_SUBJ));
          await pageObjects.dashboard.verifyNoRenderErrors();
          const tagsCells = await find.allByCssSelector(
            '[data-gridcell-column-id="kibana.alert.rule.tags"] [data-test-subj="dataGridRowCell"]'
          );
          const tags = await Promise.all(tagsCells.map((t) => t.getVisibleText()));
          expect(tags.every((tag) => tag === ruleName)).to.equal(true);
        });

        after(async () => {
          await security.testUser.restoreDefaults();
        });
      });
    }

    it.only(`should only show alerts from the observability area (o11y+stack) when selecting it`, async () => {
      await toasts.dismissIfExists();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Alerts');
      await testSubjects.existOrFail(SOLUTION_SELECTOR_SUBJ);
      await find.clickByCssSelector(`button#observability`);
      await testSubjects.click(SAVE_CONFIG_BUTTON_SUBJ);
      await retry.try(() => testSubjects.exists(DASHBOARD_PANEL_TEST_SUBJ));
      const featureCells = await find.allByCssSelector(
        '[data-gridcell-column-id="kibana.alert.rule.consumer"] [data-test-subj="dataGridRowCell"]'
      );
      const features = await Promise.all(featureCells.map((f) => f.getVisibleText()));
      // The Observability label of the solution selector implicitly includes Stack rules.
      // Observability rules have different feature labels depending on the app generating the alerts
      const expectedFeatures = ['logs', 'stack'];
      expect(
        features.every((f) => expectedFeatures.some((ef) => f.toLowerCase().includes(ef)))
      ).to.equal(true);
    });

    it(`should only show alerts from the security area when selecting it`, async () => {
      await toasts.dismissIfExists();
      await dashboardAddPanel.clickEditorMenuButton();
      await dashboardAddPanel.clickAddNewPanelFromUIActionLink('Alerts');
      await find.clickByCssSelector(`button#security`);
      await testSubjects.click(SAVE_CONFIG_BUTTON_SUBJ);
      let panels: WebElementWrapper[];
      await retry.try(async () => {
        panels = await find.allByCssSelector(`[data-test-subj=${DASHBOARD_PANEL_TEST_SUBJ}]`);
        expect(panels.length).to.equal(2);
      });
      const featureCells = await panels![1].findAllByCssSelector(
        '[data-gridcell-column-id="kibana.alert.rule.consumer"] [data-test-subj="dataGridRowCell"]'
      );
      const features = await Promise.all(featureCells.map((f) => f.getVisibleText()));
      // The Observability label of the solution selector implicitly includes Stack rules.
      // Observability rules have different feature labels depending on the app generating the alerts
      expect(features.every((f) => f.toLowerCase().includes('security'))).to.equal(true);
    });

    it("should show a missing authz prompt when the user doesn't have access to a panel's rule types", async () => {
      // User with o11y-only access should see a missing authz prompt in the security panel
      await security.testUser.setRoles([`observability_alerting`]);
      let panels = await find.allByCssSelector(`[data-test-subj=${DASHBOARD_PANEL_TEST_SUBJ}]`);
      expect(
        await testSubjects.descendantExists(NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ, panels[0])
      ).to.equal(false);
      expect(
        await testSubjects.descendantExists(NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ, panels[1])
      ).to.equal(true);

      // User with security-only access should see a missing authz prompt in the o11y panel
      await security.testUser.setRoles([`security_alerting`]);
      panels = await find.allByCssSelector(`[data-test-subj=${DASHBOARD_PANEL_TEST_SUBJ}]`);
      expect(
        await testSubjects.descendantExists(NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ, panels[0])
      ).to.equal(true);
      expect(
        await testSubjects.descendantExists(NO_AUTHORIZED_RULE_TYPE_PROMPT_SUBJ, panels[1])
      ).to.equal(false);

      await security.testUser.restoreDefaults();
    });

    it('should apply the global time filter to alert panels by default', async () => {
      await pageObjects.timePicker.setDefaultAbsoluteRange();
      await retry.try(async () =>
        expect((await testSubjects.findAll('alertsTableEmptyState')).length).to.equal(2)
      );
    });

    it('should override the time range for specific panels', async () => {
      await testSubjects.moveMouseTo(DASHBOARD_PANEL_TEST_SUBJ);
      await testSubjects.click('embeddablePanelAction-ACTION_CUSTOMIZE_PANEL');
      await testSubjects.click('customizePanelShowCustomTimeRange');
      // The nested selector is necessary to disambiguate with the global time picker
      await find.clickByCssSelector(
        '[data-test-subj=customizePanel] [data-test-subj=superDatePickerToggleQuickMenuButton]'
      );
      await testSubjects.click('superDatePickerCommonlyUsed_Last_24 hours');
      await testSubjects.click('saveCustomizePanelButton');
      await retry.try(async () =>
        expect((await testSubjects.findAll('alertsTableEmptyState')).length).to.equal(1)
      );
    });
  });
};
