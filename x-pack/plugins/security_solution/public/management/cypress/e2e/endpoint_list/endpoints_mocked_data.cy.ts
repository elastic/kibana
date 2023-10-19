/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataListResponse } from '../../../../../common/endpoint/types';
import { EndpointSortableField } from '../../../../../common/endpoint/types';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';

describe('Endpoints page', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;

  before(() => {
    indexEndpointHosts({ count: 3 }).then((indexEndpoints) => {
      endpointData = indexEndpoints;
    });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    if (endpointData) {
      endpointData.cleanup();
      // @ts-expect-error ignore setting to undefined
      endpointData = undefined;
    }
  });

  it('Loads the endpoints page', () => {
    loadPage(APP_ENDPOINTS_PATH);
    cy.contains('Hosts running Elastic Defend').should('exist');
  });

  describe('Sorting', () => {
    it('Sorts by enrollment date descending order by default', () => {
      cy.intercept('api/endpoint/metadata*').as('getEndpointMetadataRequest');

      loadPage(APP_ENDPOINTS_PATH);

      cy.wait('@getEndpointMetadataRequest').then((subject) => {
        const body = subject.response?.body as MetadataListResponse;

        expect(body.sortField).to.equal(EndpointSortableField.ENROLLED_AT);
        expect(body.sortDirection).to.equal('desc');
      });

      // no sorting indicator is present on the screen
      cy.get('.euiTableSortIcon').should('not.exist');
    });

    it('User can sort by any field', () => {
      loadPage(APP_ENDPOINTS_PATH);

      const fields = Object.values(EndpointSortableField).filter(
        // enrolled_at is not present in the table, it's just the default sorting
        (value) => value !== EndpointSortableField.ENROLLED_AT
      );

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        cy.intercept(`api/endpoint/metadata*${encodeURIComponent(field)}*`).as(`request.${field}`);

        cy.getByTestSubj(`tableHeaderCell_${field}_${i}`).as('header').click();
        validateSortingInResponse(field, 'asc');
        cy.get('@header').should('have.attr', 'aria-sort', 'ascending');
        cy.get('.euiTableSortIcon').should('exist');

        cy.get('@header').click();
        validateSortingInResponse(field, 'desc');
        cy.get('@header').should('have.attr', 'aria-sort', 'descending');
        cy.get('.euiTableSortIcon').should('exist');
      }
    });

    it('Sorting can be passed via URL', () => {
      cy.intercept('api/endpoint/metadata*').as(`request.host_status`);

      loadPage(`${APP_ENDPOINTS_PATH}?sort_field=host_status&sort_direction=desc`);

      validateSortingInResponse('host_status', 'desc');
      cy.get('[data-test-subj^=tableHeaderCell_host_status').should(
        'have.attr',
        'aria-sort',
        'descending'
      );
    });

    const validateSortingInResponse = (field: string, direction: 'asc' | 'desc') =>
      cy.wait(`@request.${field}`).then((subject) => {
        expect(subject.response?.statusCode).to.equal(200);

        const body = subject.response?.body as MetadataListResponse;
        expect(body.total).to.equal(3);
        expect(body.sortField).to.equal(field);
        expect(body.sortDirection).to.equal(direction);
      });
  });
});
