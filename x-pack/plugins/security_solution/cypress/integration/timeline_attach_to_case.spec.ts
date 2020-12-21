/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForTimeline } from '../tasks/login';
import {
  attachTimelineToNewCase,
  attachTimelineToExistingCase,
  addNewCase,
  selectCase,
} from '../tasks/timeline';
import { DESCRIPTION_INPUT, ADD_COMMENT_INPUT } from '../screens/create_new_case';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { TIMELINE_CASE_ID } from '../objects/case';
import { caseTimeline, timeline } from '../objects/timeline';
import { createTimeline, deleteTimeline } from '../tasks/api_calls/timelines';
import { cleanKibana } from '../tasks/common';

describe('attach timeline to case', () => {
  context('without cases created', () => {
    before(() => {
      cleanKibana();
      createTimeline(timeline).then((response) => {
        cy.wrap(response.body.data.persistTimeline.timeline).as('myTimeline');
      });
    });

    after(function () {
      deleteTimeline(this.myTimeline.savedObjectId);
    });

    it('attach timeline to a new case', function () {
      loginAndWaitForTimeline(this.myTimeline.savedObjectId);
      attachTimelineToNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${this.myTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${this.myTimeline.savedObjectId}%27,isOpen:!t))`
        );
      });
    });

    it('attach timeline to an existing case with no case', function () {
      loginAndWaitForTimeline(this.myTimeline.savedObjectId);
      attachTimelineToExistingCase();
      addNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${this.myTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${this.myTimeline.savedObjectId}%27,isOpen:!t))`
        );
      });
    });
  });

  context('with cases created', () => {
    before(() => {
      cleanKibana();
      esArchiverLoad('case_and_timeline');
    });

    after(() => {
      esArchiverUnload('case_and_timeline');
    });

    it('attach timeline to an existing case', () => {
      loginAndWaitForTimeline(caseTimeline.id!);
      attachTimelineToExistingCase();
      selectCase(TIMELINE_CASE_ID);

      cy.location('origin').then((origin) => {
        cy.get(ADD_COMMENT_INPUT).should(
          'have.text',
          `[${
            caseTimeline.title
          }](${origin}/app/security/timelines?timeline=(id:%27${caseTimeline.id!}%27,isOpen:!t))`
        );
      });
    });
  });
});
