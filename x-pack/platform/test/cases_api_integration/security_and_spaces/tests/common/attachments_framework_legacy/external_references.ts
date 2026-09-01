/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import expect from '@kbn/expect';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { AttachmentType, UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  defaultUser,
  postCaseReq,
  postCommentUserReq,
  postExternalReferenceESReq,
  postExternalReferenceSOReq,
} from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  findCaseUserActions,
  getReferenceFromEsResponse,
  getSOFromKibanaIndex,
  removeServerGeneratedPropertiesFromSavedObject,
  updateComment,
} from '../../../../common/lib/api';

/**
 * Legacy externalReference wire-shape coverage, ported from the former `.test`-based
 * `external_references.ts` onto real migrated types: `.files` (SO-backed) and `indicator`
 * (ES-doc). Both are routed through `EXTERNAL_REFERENCE_TYPE_MAP` to the unified validator and
 * stored byte-clean, so the legacy round-trip stays lossless.
 *
 * Not ported (premise no longer holds for typed migrated subtypes): the arbitrary-metadata
 * test (unified schemas are strict), the so<->doc update-restriction pair (`.files` and
 * `indicator` are distinct types, not one type toggling storage), and the registered-types
 * hash snapshot (the fixture registry-hash route was removed; unified snapshots cover it).
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Legacy external reference wire shapes (files / indicator)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should create an external so reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceSOReq,
      });
      const comment = removeServerGeneratedPropertiesFromSavedObject(patchedCase.comments![0]);

      expect(comment).to.eql({
        ...postExternalReferenceSOReq,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('should create an external es reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceESReq,
      });
      const comment = removeServerGeneratedPropertiesFromSavedObject(patchedCase.comments![0]);

      expect(comment).to.eql({
        ...postExternalReferenceESReq,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
        owner: 'securitySolutionFixture',
      });
    });

    it('should create an external reference user action', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceSOReq,
      });

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      const commentUserAction = userActions[1];

      expect(commentUserAction.type).to.eql('comment');
      expect(commentUserAction.action).to.eql('create');
      expect(commentUserAction.payload).to.eql({ comment: postExternalReferenceSOReq });
    });

    it('should create references and attributes correctly if externalReferenceType===so', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceSOReq,
      });

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_COMMENT_SAVED_OBJECT,
        soId: patchedCase.comments![0].id,
      });

      const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceSOReq.externalReferenceId
      );

      const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
      const { externalReferenceId, ...withoutId } = postExternalReferenceSOReq;

      expect(ref).to.eql({
        id: 'my-id',
        name: 'externalReferenceId',
        type: FILE_SO_TYPE,
      });

      expect(comment).to.eql({
        ...withoutId,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    });

    it('should create references and attributes correctly if externalReferenceType===so on user actions', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceSOReq,
      });

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      const createCommentUserAction = userActions[1];

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_USER_ACTION_SAVED_OBJECT,
        soId: createCommentUserAction.id,
      });

      const commentOnES = esResponse.body._source?.[CASE_USER_ACTION_SAVED_OBJECT]?.payload.comment;
      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceSOReq.externalReferenceId
      );

      const { externalReferenceId, ...withoutId } = postExternalReferenceSOReq;
      expect(ref).to.eql({
        id: 'my-id',
        name: 'externalReferenceId',
        type: FILE_SO_TYPE,
      });

      expect(commentOnES).to.eql(withoutId);
    });

    it('should create references and attributes correctly if externalReferenceType===doc', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceESReq,
      });

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_COMMENT_SAVED_OBJECT,
        soId: patchedCase.comments![0].id,
      });

      const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
      const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceESReq.externalReferenceId
      );

      expect(ref).to.be(undefined);
      expect(comment).to.eql({
        ...postExternalReferenceESReq,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    });

    it('should create references and attributes correctly if externalReferenceType===doc on user actions', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceESReq,
      });

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      const createCommentUserAction = userActions.find(
        (userAction) => userAction.type === UserActionTypes.comment
      );

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_USER_ACTION_SAVED_OBJECT,
        soId: createCommentUserAction!.id,
      });

      const commentOnES = esResponse.body._source?.[CASE_USER_ACTION_SAVED_OBJECT]?.payload.comment;
      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceESReq.externalReferenceId
      );

      expect(ref).to.be(undefined);
      expect(commentOnES).to.eql(postExternalReferenceESReq);
    });

    it('should create references and attributes correctly if externalReferenceType===so when bulk create', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [postCommentUserReq, postExternalReferenceSOReq],
      });

      const externalRefComment = patchedCase.comments?.find(
        (comment) => comment.type === AttachmentType.externalReference
      );

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_COMMENT_SAVED_OBJECT,
        soId: externalRefComment!.id,
      });

      const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];

      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceSOReq.externalReferenceId
      );

      const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
      const { externalReferenceId, ...withoutId } = postExternalReferenceSOReq;

      expect(ref).to.eql({
        id: 'my-id',
        name: 'externalReferenceId',
        type: FILE_SO_TYPE,
      });

      expect(comment).to.eql({
        ...withoutId,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    });

    it('should create references and attributes correctly if externalReferenceType===doc when bulk create', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [postCommentUserReq, postExternalReferenceESReq],
      });

      const externalRefComment = patchedCase.comments?.find(
        (comment) => comment.type === AttachmentType.externalReference
      );

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_COMMENT_SAVED_OBJECT,
        soId: externalRefComment!.id,
      });

      const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
      const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
      const ref = getReferenceFromEsResponse(
        esResponse,
        postExternalReferenceESReq.externalReferenceId
      );

      expect(ref).to.be(undefined);
      expect(comment).to.eql({
        ...postExternalReferenceESReq,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: null,
      });
    });

    it('should put the new externalReferenceId to the SO references when updating the attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postExternalReferenceSOReq,
      });

      await updateComment({
        supertest,
        caseId: postedCase.id,
        req: {
          id: patchedCase.comments![0].id,
          version: patchedCase.comments![0].version,
          ...postExternalReferenceSOReq,
          externalReferenceId: 'my-new-id',
        },
      });

      const esResponse = await getSOFromKibanaIndex({
        es,
        soType: CASE_COMMENT_SAVED_OBJECT,
        soId: patchedCase.comments![0].id,
      });

      const commentOnES = esResponse.body._source?.[CASE_COMMENT_SAVED_OBJECT];
      const comment = removeServerGeneratedPropertiesFromSavedObject(commentOnES);
      const ref = getReferenceFromEsResponse(esResponse, 'my-new-id');
      const { externalReferenceId, ...withoutId } = postExternalReferenceSOReq;

      expect(ref).to.eql({
        id: 'my-new-id',
        name: 'externalReferenceId',
        type: FILE_SO_TYPE,
      });

      expect(comment).to.eql({
        ...withoutId,
        created_by: defaultUser,
        pushed_at: null,
        pushed_by: null,
        updated_by: defaultUser,
      });
    });

    it('should return 400 when missing attributes for external reference type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const reqKeys = Object.keys(postExternalReferenceSOReq);
      for (const key of reqKeys) {
        await createComment({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error
          params: omit(key, postExternalReferenceSOReq),
          expectedHttpCode: 400,
        });
      }
    });

    it('400s when adding excess attributes for external reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        // @ts-expect-error
        params: { ...postExternalReferenceSOReq, notValid: 'test' },
        expectedHttpCode: 400,
      });
    });

    it('400s when creating a non registered external reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: { ...postExternalReferenceSOReq, externalReferenceAttachmentTypeId: 'not-exists' },
        expectedHttpCode: 400,
      });
    });

    it('400s when bulk creating a non registered external reference attachment type', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          postExternalReferenceSOReq,
          { ...postExternalReferenceSOReq, externalReferenceAttachmentTypeId: 'not-exists' },
        ],
        expectedHttpCode: 400,
      });
    });
  });
};
