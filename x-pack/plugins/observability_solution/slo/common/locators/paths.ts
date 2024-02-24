/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SLOS_PATH = '/slos' as const;
export const SLOS_WELCOME_PATH = '/slos/welcome' as const;
export const SLO_DETAIL_PATH = '/slos/:sloId' as const;
export const SLO_CREATE_PATH = '/slos/create' as const;
export const SLO_EDIT_PATH = '/slos/edit/:sloId' as const;
export const SLOS_OUTDATED_DEFINITIONS_PATH = '/slos/outdated-definitions' as const;

export const paths = {
    slos: `${SLOS_PATH}`,
    slosWelcome: `${SLOS_WELCOME_PATH}`,
    slosOutdatedDefinitions: `${SLOS_OUTDATED_DEFINITIONS_PATH}`,
    sloCreate: `${SLO_CREATE_PATH}`,
    sloCreateWithEncodedForm: (encodedParams: string) =>
      `${SLO_CREATE_PATH}?_a=${encodedParams}`,
    sloEdit: (sloId: string) => `${SLOS_PATH}/edit/${encodeURI(sloId)}`,
    sloEditWithEncodedForm: (sloId: string, encodedParams: string) =>
      `${SLOS_PATH}/edit/${encodeURI(sloId)}?_a=${encodedParams}`,
    sloDetails: (sloId: string, instanceId?: string) =>
      !!instanceId
        ? `${SLOS_PATH}/${encodeURI(sloId)}?instanceId=${encodeURI(
            instanceId
          )}`
        : `${SLOS_PATH}/${encodeURI(sloId)}`,
};
