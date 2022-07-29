/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

const expectedDifference = ;

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const PageObjects = getPageObjects([
    'resetSessionPage',
    'common',
    'timePicker',
  ]);
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('testSubjects');
  const log = getService('log');

  let container = null;
  beforeEach(() => {
    // setup a DOM element as a render target
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => {
    // cleanup on exiting
    unmountComponentAtNode(container);
    container.remove();
    container = null;
  });
  //First navigate to the reset session page
  describe('navigate to the reset session Page', function () {
    before(async function () {
      await PageObjects.common.navigateToUrl('home', '/path/to/logout', {
        useActualUrl: true,
      });
    });
    //check reset session component
    it("should render the ResetSessionPage", () => {
      act(() => {
        render(
          <ResetSessionPage/>,
          container
        );
      });
    expect(container.innerHTML).toMatchInlineSnapshot();
    //check if a message is shown 
    it("should render a 'You do not have permission to access the requested page'", () => {
      act(() => {
        render(<ResetSessionPage/>, container);
    });
    expect(container.innerHTML).toMatchInlineSnapshot();
    //When the user hovers on the reset session button
    it('when the user hovers over the reset session button', () => {
      let buttonPrimary: WebElementWrapper;
      beforeEach(async () => {
        // hover the button
        buttonPrimary = await this.findAllByTestSubject(`ResetSessionButton`);
        await buttonPrimary.moveMouseTo();
      });
      it('should render as expected', async () => {
        expect(
          await screenshot.compareAgainstBaseline(
            `${fileNamePrefix}_with_primary_button_hovered`,
            updateBaselines,
          )
        ).to.be.lessThan(expectedDifference);
      });
      //When the user clicks on the reset session button
      async clickPrimaryButton() {
          await testSubjects.click('ResetSessionButton');
        };
        it('should render as expected', async () => {
          expect(
            await screenshot.compareAgainstBaseline(
              `${fileNamePrefix}_with_primary_button_hovered`,
              updateBaselines,
            )
          ).to.be.lessThan(expectedDifference);
        });
      //When the user hovers on the go back button
      it('when the user hovers over the secondary button', () => {
        let buttonSecondary: WebElementWrapper;
        beforeEach(async () => {
          // hover the button
          buttonSecondary = await this.findAllByTestSubject(`GoBackButton`);
          await buttonSecondary.moveMouseTo();
        });
        it('should render as expected', async () => {
          expect(
            await screenshot.compareAgainstBaseline(
              `${fileNamePrefix}_with_secondary_button_hovered`,
              updateBaselines,
            )
          ).to.be.lessThan(expectedDifference);
        });
        //When the user clicks on the go back button
        async goBackButton() {
            await testSubjects.click('GoBackButton');
          };
          it('should render as expected', async () => {
            expect(
              await screenshot.compareAgainstBaseline(
                `${fileNamePrefix}_with_secondary_button_hovered`,
                updateBaselines,
              )
            ).to.be.lessThan(expectedDifference);
          });
          
        });
      }