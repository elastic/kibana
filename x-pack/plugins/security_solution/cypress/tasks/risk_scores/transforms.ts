/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRANSFORMS_URL } from '../../urls/risk_score';

export const getTransformState = (transformId: string) => {
  return cy.request<{ transforms: Array<{ id: string; state: string }>; count: number }>({
    method: 'get',
    url: `${TRANSFORMS_URL}/transforms/${transformId}/_stats`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
  });
};

export const startTransforms = (transformIds: string[]) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/start_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body: transformIds.map((id) => ({
      id,
    })),
  });
};

const stopTransform = (state: {
  transforms: Array<{ id: string; state: string }>;
  count: number;
}) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/stop_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body:
      state != null && state.transforms.length > 0
        ? [
            {
              id: state.transforms[0].id,
              state: state.transforms[0].state,
            },
          ]
        : ([] as Array<{ id: string; state: string }>),
  });
};

export const createTransform = (transformId: string, options: string | Record<string, unknown>) => {
  return cy.request({
    method: 'put',
    url: `${TRANSFORMS_URL}/transforms/${transformId}`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    body: options,
  });
};

export const deleteTransform = (transformId: string) => {
  return cy.request({
    method: 'post',
    url: `${TRANSFORMS_URL}/delete_transforms`,
    headers: { 'kbn-xsrf': 'cypress-creds-via-config' },
    failOnStatusCode: false,
    body: {
      transformsInfo: [
        {
          id: transformId,
          state: 'stopped',
        },
      ],
      deleteDestIndex: true,
      deleteDestDataView: true,
      forceDelete: false,
    },
  });
};

export const deleteTransforms = (transformIds: string[]) => {
  const deleteSingleTransform = (transformId: string) =>
    getTransformState(transformId)
      .then(({ body: result }) => {
        return stopTransform(result);
      })
      .then(() => {
        deleteTransform(transformId);
      });

  transformIds.map((transformId) => deleteSingleTransform(transformId));
};
