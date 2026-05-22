/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, tagManagement, dashboard, header } = getPageObjects([
    'visualize',
    'lens',
    'tagManagement',
    'dashboard',
    'header',
  ]);
  const find = getService('find');
  const retry = getService('retry');
  const toastsService = getService('toasts');
  const testSubjects = getService('testSubjects');
  const listingTable = getService('listingTable');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('lens annotations tests', () => {
    it('should show a disabled annotation layer button if there is no date histogram in data layer', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.dragFieldToWorkspace('geo.src', 'xyVisChart');
      await testSubjects.click('lnsLayerAddButton');
      await retry.waitFor('wait for layer popup to appear', async () =>
        testSubjects.exists(`lnsLayerAddButton-annotations`)
      );
      expect(
        await (await testSubjects.find(`lnsLayerAddButton-annotations`)).getAttribute('disabled')
      ).to.be('true');

      // click add layer button again to close the popup
      await testSubjects.click('lnsLayerAddButton');
    });

    it('should add manual annotation layer with static date and allow edition', async () => {
      await lens.removeLayer();
      await lens.ensureLayerTabIsActive();
      await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

      await lens.createLayer('annotations');

      await lens.assertLayerCount(2);
      // switch to the annotation tab
      await lens.ensureLayerTabIsActive(1);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_textVisibility_name');
      await lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisAnnotationIcon');
      await testSubjects.existOrFail('xyVisAnnotationText');
    });

    it('should duplicate the style when duplicating an annotation and group them in the chart', async () => {
      // drag and drop to the empty field to generate a duplicate
      await lens.dragDimensionToDimension({
        from: 'lnsXY_xAnnotationsPanel > lns-dimensionTrigger',
        to: 'lnsXY_xAnnotationsPanel > lns-empty-dimension',
      });

      await (
        await find.byCssSelector(
          '[data-test-subj="lnsXY_xAnnotationsPanel"]:nth-child(2) [data-test-subj="lns-dimensionTrigger"]'
        )
      ).click();
      expect(
        await find.existsByCssSelector(
          '[data-test-subj="lnsXY_textVisibility_name"][class*="euiButtonGroupButton-isSelected"]'
        )
      ).to.be(true);
      await lens.closeDimensionEditor();
      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });

    it('should add query annotation layer and allow edition', async () => {
      await lens.removeLayer(1);
      await lens.assertLayerCount(1);
      await lens.createLayer('annotations');

      await lens.assertLayerCount(2);
      // switch to the annotation tab
      await lens.ensureLayerTabIsActive(1);
      expect(
        await (
          await testSubjects.find('lnsXY_xAnnotationsPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Event');
      await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_annotation_query');
      await lens.configureQueryAnnotation({
        queryString: '*',
        timeField: 'utc_time',
        textDecoration: { type: 'name' },
        extraFields: ['clientip'],
      });
      await lens.closeDimensionEditor();

      await testSubjects.existOrFail('xyVisGroupedAnnotationIcon');
    });

    describe('library annotation groups', () => {
      const ANNOTATION_GROUP_TITLE = 'library annotation group';
      const FIRST_VIS_TITLE = 'first visualization';
      const SECOND_VIS_TITLE = 'second visualization';
      const DASHBOARD_TITLE = 'annotation sync test dashboard';

      it('should save annotation group to library', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

        await lens.createLayer('annotations');

        await lens.performLayerAction('lnsXY_annotationLayer_saveToLibrary', 1);

        await visualize.setSaveModalValues(ANNOTATION_GROUP_TITLE, {
          description: 'my description',
        });

        await testSubjects.click('savedObjectTagSelector');
        await testSubjects.click(`tagSelectorOption-action__create`);

        const { tagModal } = tagManagement;

        expect(await tagModal.isOpened()).to.be(true);

        await tagModal.fillForm(
          {
            name: 'my-new-tag',
            color: '#FFCC33',
            description: '',
          },
          {
            submit: true,
            clearWithKeyboard: true,
          }
        );

        expect(await tagModal.isOpened()).to.be(false);

        await testSubjects.click('confirmSaveSavedObjectButton');

        await retry.try(async () => {
          const toastContents = await toastsService.getContentByIndex(1);
          expect(toastContents).to.be(
            `Saved "${ANNOTATION_GROUP_TITLE}"\nView or manage in the annotation library.`
          );
        });

        await lens.save(FIRST_VIS_TITLE);

        // TODO test that saved object info gets populated on subsequent save
      });

      it('should add annotation group from library', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await lens.dragFieldToWorkspace('@timestamp', 'xyVisChart');

        await lens.createLayer('annotations', ANNOTATION_GROUP_TITLE);

        await lens.assertLayerCount(2);

        await lens.save(SECOND_VIS_TITLE);
      });

      it('should sync annotation group updates across dashboard panels', async () => {
        await dashboard.navigateToApp();
        await dashboard.clickNewDashboard();
        await dashboardAddPanel.addEmbeddable(FIRST_VIS_TITLE);
        await dashboardPanelActions.clonePanel(FIRST_VIS_TITLE);
        await dashboard.saveDashboard(DASHBOARD_TITLE);
        await dashboard.waitForRenderComplete();

        // Neither panel should show annotation text yet (text visibility is off)
        const textsBefore = await find.allByCssSelector(
          '[data-test-subj="xyVisAnnotationText"]',
          1000
        );
        expect(textsBefore.length).to.be(0);

        // Switch to edit mode so panel actions are available
        await dashboard.switchToEditMode();

        // Inline-edit the first panel
        const firstPanel = await dashboardPanelActions.getPanelWrapper(FIRST_VIS_TITLE);
        await dashboardPanelActions.clickInlineEdit(firstPanel);

        // Switch to the annotation layer and enable text visibility
        await lens.ensureLayerTabIsActive(1);
        await testSubjects.click('lnsXY_xAnnotationsPanel > lns-dimensionTrigger');
        await testSubjects.click('lnsXY_textVisibility_name');
        await lens.closeDimensionEditor();

        // Click "Apply and close" — this auto-saves the linked annotation to the
        // library and propagates updates to other panels via annotationGroupUpdated$.
        await testSubjects.click('applyFlyoutButton');
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        // Both panels should now show the "Event" annotation text
        await retry.waitFor('annotation text to appear in both panels', async () => {
          const texts = await find.allByCssSelector('[data-test-subj="xyVisAnnotationText"]', 1000);
          return texts.length >= 2;
        });
      });

      it('should remove layer for deleted annotation group', async () => {
        await visualize.gotoVisualizationLandingPage();
        await visualize.selectAnnotationsTab();
        await listingTable.deleteItem(ANNOTATION_GROUP_TITLE);
        await visualize.selectVisualizationsTab();
        await visualize.loadSavedVisualization(FIRST_VIS_TITLE, {
          navigateToVisualize: false,
        });

        await lens.assertLayerCount(1);
      });

      it('should remove annotation layer from dashboard panel when group is deleted', async () => {
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard(DASHBOARD_TITLE);
        await dashboard.waitForRenderComplete();

        // The annotation group was deleted in the previous test. The inline-edited
        // panels (saved via saveByRef in persisted format) should no longer render
        // annotation text after reloading from the saved object.
        await retry.waitFor('annotation text to disappear from dashboard panels', async () => {
          const texts = await find.allByCssSelector('[data-test-subj="xyVisAnnotationText"]', 1000);
          return texts.length === 0;
        });
      });

      // TODO check various saving configurations (linked layer, clean by-ref, revert)

      // TODO check annotation library, including delete flow
    });
  });
}
