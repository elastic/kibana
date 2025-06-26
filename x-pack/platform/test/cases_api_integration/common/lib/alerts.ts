/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import type { Case } from '@kbn/cases-plugin/common';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { superUser } from './authentication/users';
import type { User } from './authentication/types';
import { getSpaceUrlPrefix } from './api/helpers';
import { createCase, deleteCases } from './api/case';
import { createComment, deleteAllComments } from './api';
import { postCaseReq } from './mock';

interface AlertResponse {
  'kibana.alert.case_ids'?: string[];
}

export const getAlertById = async ({
  supertest,
  id,
  index,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  id: string;
  index: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<AlertResponse> => {
  const { body: alert } = await supertest
    .get(`${getSpaceUrlPrefix(auth?.space)}/internal/rac/alerts?id=${id}&index=${index}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .expect(expectedHttpCode);

  return alert;
};

export type Alerts = Array<{ _id: string; _index: string }>;

export const createCaseAttachAlertAndDeleteAlert = async ({
  supertest,
  totalCases,
  indexOfCaseToDelete,
  owner,
  expectedHttpCode = 204,
  deleteCommentAuth = { user: superUser, space: 'space1' },
  alerts,
  getAlerts,
}: {
  supertest: SuperTest.Agent;
  totalCases: number;
  indexOfCaseToDelete: number;
  owner: string;
  expectedHttpCode?: number;
  deleteCommentAuth?: { user: User; space: string | null };
  alerts: Alerts;
  getAlerts: (alerts: Alerts) => Promise<Array<Record<string, unknown>>>;
}) => {
  const updatedCases = await createCaseAndAttachAlert({
    supertest,
    totalCases,
    owner,
    alerts,
    getAlerts,
  });

  const caseToDelete = updatedCases[indexOfCaseToDelete];

  await deleteAllComments({
    supertest,
    caseId: caseToDelete.id,
    expectedHttpCode,
    auth: deleteCommentAuth,
  });

  const alertAfterDeletion = await getAlerts(alerts);
  const caseIdsWithoutRemovedCase = getCaseIdsWithoutRemovedCases({
    expectedHttpCode,
    updatedCases,
    caseIdsToDelete: [caseToDelete.id],
  });

  for (const alert of alertAfterDeletion) {
    expect(alert[ALERT_CASE_IDS]).eql(caseIdsWithoutRemovedCase);
  }
};

export const createCaseAttachAlertAndDeleteCase = async ({
  supertest,
  totalCases,
  indicesOfCaseToDelete,
  owner,
  expectedHttpCode = 204,
  deleteCaseAuth = { user: superUser, space: 'space1' },
  alerts,
  getAlerts,
}: {
  supertest: SuperTest.Agent;
  totalCases: number;
  indicesOfCaseToDelete: number[];
  owner: string;
  expectedHttpCode?: number;
  deleteCaseAuth?: { user: User; space: string | null };
  alerts: Alerts;
  getAlerts: (alerts: Alerts) => Promise<Array<Record<string, unknown>>>;
}) => {
  const updatedCases = await createCaseAndAttachAlert({
    supertest,
    totalCases,
    owner,
    alerts,
    getAlerts,
  });

  const casesToDelete = updatedCases.filter((_, filterIndex) =>
    indicesOfCaseToDelete.some((indexToDelete) => indexToDelete === filterIndex)
  );

  const caseIdsToDelete = casesToDelete.map((theCase) => theCase.id);

  await deleteCases({
    supertest,
    caseIDs: caseIdsToDelete,
    expectedHttpCode,
    auth: deleteCaseAuth,
  });

  const alertAfterDeletion = await getAlerts(alerts);
  const caseIdsWithoutRemovedCase = getCaseIdsWithoutRemovedCases({
    expectedHttpCode,
    updatedCases,
    caseIdsToDelete,
  });

  for (const alert of alertAfterDeletion) {
    expect(alert[ALERT_CASE_IDS]).eql(caseIdsWithoutRemovedCase);
  }
};

export const createCaseAndAttachAlert = async ({
  supertest,
  totalCases,
  owner,
  alerts,
  getAlerts,
}: {
  supertest: SuperTest.Agent;
  totalCases: number;
  owner: string;
  alerts: Alerts;
  getAlerts: (alerts: Alerts) => Promise<Array<Record<string, unknown>>>;
}): Promise<Case[]> => {
  const cases = await Promise.all(
    [...Array(totalCases).keys()].map((index) =>
      createCase(
        supertest,
        {
          ...postCaseReq,
          owner,
          settings: { syncAlerts: false },
        },
        200,
        { user: superUser, space: 'space1' }
      )
    )
  );

  const updatedCases = [];

  for (const theCase of cases) {
    const updatedCase = await createComment({
      supertest,
      caseId: theCase.id,
      params: {
        alertId: alerts.map((alert) => alert._id),
        index: alerts.map((alert) => alert._index),
        rule: {
          id: 'id',
          name: 'name',
        },
        owner,
        type: AttachmentType.alert,
      },
      auth: { user: superUser, space: 'space1' },
    });

    updatedCases.push(updatedCase);
  }

  const caseIds = updatedCases.map((theCase) => theCase.id);

  const updatedAlerts = await getAlerts(alerts);

  for (const alert of updatedAlerts) {
    expect(alert[ALERT_CASE_IDS]).eql(caseIds);
  }

  return updatedCases;
};

export const getCaseIdsWithoutRemovedCases = ({
  updatedCases,
  caseIdsToDelete,
  expectedHttpCode,
}: {
  expectedHttpCode: number;
  updatedCases: Array<{ id: string }>;
  caseIdsToDelete: string[];
}) => {
  return expectedHttpCode === 204
    ? updatedCases
        .filter((theCase) => !caseIdsToDelete.some((id) => theCase.id === id))
        .map((theCase) => theCase.id)
    : updatedCases.map((theCase) => theCase.id);
};
