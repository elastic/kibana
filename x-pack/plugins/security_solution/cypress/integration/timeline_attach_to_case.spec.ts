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
import { case1 } from '../objects/case';
import { timeline } from '../objects/timeline';
import { createTimeline, deleteTimeline } from '../tasks/api_calls/timelines';
import { cleanKibana } from '../tasks/common';
import { createCase } from '../tasks/api_calls/cases';

describe('attach timeline to case', () => {
  const myTimeline = { ...timeline };

  context('without cases created', () => {
    before(() => {
      cleanKibana();
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
    let timelineId: string;
    let caseId: string;
    before(() => {
      cleanKibana();
      createTimeline(timeline).then((response) => {
        timelineId = response.body.data.persistTimeline.timeline.savedObjectId;
      });
      createCase(case1).then((response) => {
        caseId = response.body.id;
      });
    });

    it('attach timeline to an existing case', () => {
      loginAndWaitForTimeline(timelineId);
      attachTimelineToExistingCase();
      selectCase(caseId);

      cy.location('origin').then((origin) => {
        cy.get(ADD_COMMENT_INPUT).should(
          'have.text',
          `[${timeline.title}](${origin}/app/security/timelines?timeline=(id:%27${timelineId}%27,isOpen:!t))`
        );
      });
    });
  });
});
