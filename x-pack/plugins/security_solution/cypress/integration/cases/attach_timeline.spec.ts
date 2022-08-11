/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visitTimeline } from '../../tasks/login';
import {
  attachTimelineToNewCase,
  attachTimelineToExistingCase,
  addNewCase,
  selectCase,
} from '../../tasks/timeline';
import { DESCRIPTION_INPUT, ADD_COMMENT_INPUT } from '../../screens/create_new_case';
import { getCase1 } from '../../objects/case';
import { getTimeline } from '../../objects/timeline';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana, deleteTimelines } from '../../tasks/common';
import { createCase } from '../../tasks/api_calls/cases';

describe('attach timeline to case', () => {
  context('without cases created', () => {
    before(() => {
      cleanKibana();
      login();
    });
    beforeEach(() => {
      deleteTimelines();
      createTimeline(getTimeline()).then((response) => {
        cy.wrap(response.body.data.persistTimeline.timeline).as('myTimeline');
      });
    });

    it('attach timeline to a new case', function () {
      visitTimeline(this.myTimeline.savedObjectId);
      attachTimelineToNewCase();

      cy.location('origin').then((origin) => {
        cy.get(DESCRIPTION_INPUT).should(
          'have.text',
          `[${this.myTimeline.title}](${origin}/app/security/timelines?timeline=(id:%27${this.myTimeline.savedObjectId}%27,isOpen:!t))`
        );
      });
    });

    it('attach timeline to an existing case with no case', function () {
      visitTimeline(this.myTimeline.savedObjectId);
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
      deleteTimelines();
      createTimeline(getTimeline()).then((response) =>
        cy.wrap(response.body.data.persistTimeline.timeline.savedObjectId).as('timelineId')
      );
      createCase(getCase1()).then((response) => cy.wrap(response.body.id).as('caseId'));
    });

    it('attach timeline to an existing case', function () {
      visitTimeline(this.timelineId);
      attachTimelineToExistingCase();
      selectCase(this.caseId);

      cy.location('origin').then((origin) => {
        cy.get(ADD_COMMENT_INPUT).should(
          'have.text',
          `[${getTimeline().title}](${origin}/app/security/timelines?timeline=(id:%27${
            this.timelineId
          }%27,isOpen:!t))`
        );
      });
    });
  });
});
