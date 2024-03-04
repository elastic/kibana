/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import moment from 'moment/moment';
import { synthtrace } from '../../../synthtrace';
import { generateMobileData } from './generate_mobile.data';

const start = Date.now() - 1000;
const end = Date.now();

const rangeFrom = new Date(start).toISOString();
const rangeTo = new Date(end).toISOString();

const apiRequestsToIntercept = [
  {
    endpoint: '/internal/apm/mobile-services/synth-android/most_used_charts?*',
    aliasName: 'mostUsedChartRequest',
  },
];

const aliasNames = apiRequestsToIntercept.map(
  ({ aliasName }) => `@${aliasName}`
);

const apmMobileServiceOverview = url.format({
  pathname: 'app/apm/mobile-services/synth-android',
  query: {
    rangeFrom,
    rangeTo,
  },
});
describe('Mobile Service overview page', () => {
  before(() => {
    synthtrace.index(
      generateMobileData({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  describe('Mobile service overview with charts', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana(apmMobileServiceOverview);
      apiRequestsToIntercept.map(({ endpoint, aliasName }) => {
        cy.intercept('GET', endpoint).as(aliasName);
      });
    });

    describe('accessing android service page', () => {
      it('shows the most used charts', () => {
        cy.wait(aliasNames);

        cy.getByTestSubj('mostUsedChart-device').should('exist');
        cy.getByTestSubj('mostUsedChart-netConnectionType').should('exist');
        cy.getByTestSubj('mostUsedChart-osVersion').should('exist');
        cy.getByTestSubj('mostUsedChart-appVersion').should('exist');
      });

      it('shows No results found, when no data is present', () => {
        cy.wait(aliasNames);

        const timeStart = moment(start).subtract(5, 'm').toISOString();
        const timeEnd = moment(end).subtract(5, 'm').toISOString();

        cy.selectAbsoluteTimeRange(timeStart, timeEnd);

        cy.contains('Update').click();

        cy.wait(aliasNames);

        cy.expectAPIsToHaveBeenCalledWith({
          apisIntercepted: aliasNames,
          value: `start=${encodeURIComponent(
            new Date(timeStart).toISOString()
          )}&end=${encodeURIComponent(new Date(timeEnd).toISOString())}`,
        });
        cy.getByTestSubj('mostUsedNoResultsFound').should('exist');
      });
    });
  });
});
