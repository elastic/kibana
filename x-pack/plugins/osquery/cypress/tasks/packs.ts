/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash';
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

export const deactivatePack = (packName: string) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  closeModalIfVisible();

  cy.contains(`Successfully deactivated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully deactivated "${packName}" pack`).should('exist');
  closeToastIfVisible();
};

export const activatePack = (packName: string) => {
  cy.react('ActiveStateSwitchComponent', {
    props: { item: { attributes: { name: packName } } },
  }).click();
  closeModalIfVisible();

  cy.contains(`Successfully activated "${packName}" pack`).should('not.exist');
  cy.contains(`Successfully activated "${packName}" pack`).should('exist');
  closeToastIfVisible();
};

export const cleanupAllPrebuiltPacks = () => {
  request<UsePacksResponse>({
    method: 'GET',
    url: '/api/osquery/packs',
  }).then((response) => {
    const prebuiltPacks = response.body.data?.filter((pack) =>
      some(pack.references, { type: 'osquery-pack-asset' })
    );

    return Promise.all(prebuiltPacks?.map((pack) => cleanupPack(pack.id)));
  });
};
