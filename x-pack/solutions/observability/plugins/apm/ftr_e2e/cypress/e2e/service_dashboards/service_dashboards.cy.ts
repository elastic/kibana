/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { generateData } from './generate_data';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const serviceDashboardsHref = url.format({
  pathname: '/app/apm/services/synth-python/dashboards',
  query: { rangeFrom: start, rangeTo: end },
});

const apiToIntercept = {
  endpoint: '/internal/apm/services/synth-python/transactions/charts/coldstart_rate?*',
  name: 'coldStartRequest',
};

describe('Service dashboard - aws lambda', () => {
  let dashboardId: string;
  before(() => {
    synthtrace.index(
      generateData({
        start: new Date(start).getTime(),
        end: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
    cy.request({
      method: 'DELETE',
      url: `/api/dashboards/${dashboardId}`,
      headers: {
        'kbn-xsrf': 'foo',
        'elastic-api-version': 1,
      },
    });
  });

  it('displays a linked dashboard with a control group', () => {
    const { endpoint, name } = apiToIntercept;
    cy.intercept('GET', endpoint).as(name);

    cy.loginAsEditorUser();
    cy.request({
      method: 'POST',
      url: '/api/dashboards?allowUnmappedKeys=true',
      body: {
        data: {
          tags: [],
          title: 'Test board',
          options: {
            hide_panel_titles: false,
            use_margins: true,
            auto_apply_filters: true,
            sync_colors: false,
            sync_cursor: true,
            sync_tooltips: false,
          },
          query: { query: '', language: 'kuery' },
          panels: [],
          pinned_panels: [
            {
              uid: 'control-uuid',
              type: 'optionsListControl',
              width: 'medium',
              grow: false,
              config: {
                fieldName: 'geo.dest',
                useGlobalFilters: true,
                ignoreValidations: false,
                exclude: false,
                existsSelected: false,
                selectedOptions: [],
                sort: { by: '_count', direction: 'desc' },
                dataViewId: 'test-data-view',
              },
            },
          ],
          description: '',
        },
      },
      headers: {
        'kbn-xsrf': 'foo',
        'elastic-api-version': 1,
      },
    }).then((response) => {
      dashboardId = response.body.id;
      cy.visitKibana(serviceDashboardsHref);
      cy.getByTestSubj('apmAddServiceDashboard').should('be.visible').click();
      cy.get('[data-test-subj="apmSelectServiceDashboard"] [data-test-subj="comboBoxInput"]')
        .should('be.visible')
        .click();
      cy.contains('Test board').should('be.visible').click();
      cy.getByTestSubj('apmSelectDashboardButton').should('be.visible').click();
      cy.getByTestSubj('controls-group-wrapper').should('be.visible');
    });
  });
});
