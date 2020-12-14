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

describe('attach timeline to case', () => {
  const myTimeline = { ...timeline };

  context('without cases created', () => {
    before(() => {
      createTimeline(timeline).then((response) => {
        myTimeline.id = response.body.data.persistTimeline.timeline.savedObjectId;
      });
    });

    after(() => {
      deleteTimeline(myTimeline.id!);
    });

    it('attach timeline to a new case', () => {
      loginAndWaitForTimeline(myTimeline.id!);
      attachTimelineToNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${myTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${myTimeline.id}%27,isOpen:!t))`
        );
      });
    });

    it('attach timeline to an existing case with no case', () => {
      loginAndWaitForTimeline(myTimeline.id!);
      attachTimelineToExistingCase();
      addNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${
            myTimeline.title
          }](${origin}/app/security/timelines?timeline=(id:%27${myTimeline.id!}%27,isOpen:!t))`
        );
      });
    });
  });

  context('with cases created', () => {
    before(() => {
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
