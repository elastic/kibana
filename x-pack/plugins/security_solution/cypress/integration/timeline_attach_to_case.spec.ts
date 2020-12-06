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
import { caseTimeline, TIMELINE_CASE_ID } from '../objects/case';

describe('attach timeline to case', () => {
  beforeEach(() => {
    loginAndWaitForTimeline(caseTimeline.id);
  });
  context('without cases created', () => {
    before(() => {
      esArchiverLoad('timeline');
    });

    after(() => {
      esArchiverUnload('timeline');
    });

    it('attach timeline to a new case', () => {
      attachTimelineToNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${caseTimeline.id}%27,isOpen:!t))`
        );
      });
    });

    it('attach timeline to an existing case with no case', () => {
      attachTimelineToExistingCase();
      addNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${caseTimeline.id}%27,isOpen:!t))`
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
      attachTimelineToExistingCase();
      selectCase(TIMELINE_CASE_ID);

      cy.location('origin').then((origin) => {
        cy.get(ADD_COMMENT_INPUT).should(
          'have.text',
          `[${caseTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${caseTimeline.id}%27,isOpen:!t))`
        );
      });
    });
  });
});
