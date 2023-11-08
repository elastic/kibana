/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash';
import { API_VERSIONS } from '../../common/constants';
import type { UsePacksResponse } from '../../public/packs/use_packs';
import { request } from './common';
import { closeModalIfVisible, closeToastIfVisible } from './integrations';
import { cleanupPack } from './api_fixtures';

export const preparePack = (packName: string) => {
  cy.contains('Packs').click();
  cy.getBySel('tablePaginationPopoverButton').click();
  cy.getBySel('tablePagination-50-rows').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

export const changePackActiveStatus = (packName: string) => {
  const regex = new RegExp(`Successfully (activated|deactivated) "${packName}" pack`);

  cy.getBySel('globalLoadingIndicator').should('not.exist');
  cy.get(`[aria-label="${packName}"]`).click();
  closeModalIfVisible();
  cy.contains(regex).should('not.exist');
  cy.contains(regex).should('exist');
  closeToastIfVisible();
  cy.contains(regex).should('not.exist');
};

export const cleanupAllPrebuiltPacks = () => {
  request<UsePacksResponse>({
    method: 'GET',
    url: '/api/osquery/packs',
    headers: {
      'Elastic-Api-Version': API_VERSIONS.public.v1,
    },
  }).then((response) => {
    const prebuiltPacks = response.body.data?.filter((pack) =>
      some(pack.references, { type: 'osquery-pack-asset' })
    );

    return Promise.all(prebuiltPacks?.map((pack) => cleanupPack(pack.saved_object_id)));
  });
};
