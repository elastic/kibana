/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import {
  AttachmentType,
  CaseStatuses,
  UserActionTypes,
} from '@kbn/cases-plugin/common/types/domain';
import {
  CASE_SAVED_OBJECT,
  MAX_ALERTS_PER_CASE,
  MAX_ATTACHMENT_JSON_LENGTH,
  SECURITY_ALERT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  buildUnifiedAlertReq,
  getPostCaseRequest,
  getUnifiedFilesAttachmentReq,
  postCaseReq,
  postUnifiedAlertReq,
  userActionSourceApi,
  userActionSourceUser,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  addAttachmentV2,
  findCaseUserActions,
  getAttachmentV2,
  getCase,
  getSOFromKibanaIndex,
  seedLegacyCommentAttachment,
  updateAttachmentV2,
  updateCaseStatus,
  superUserSpace1Auth,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  secOnly,
  superUser,
} from '../../../../common/lib/authentication/users';

const unifiedCommentReq = {
  type: 'comment' as const,
  data: { content: 'This is a cool comment' },
  owner: 'securitySolutionFixture',
};

// The comment schema also rejects this, so the assertion pins the route's serialized-size check.
const oversizedData = { content: 'a'.repeat(MAX_ATTACHMENT_JSON_LENGTH) };
const dataTooLargeMessage = `The data field is too large. The maximum serialized length is ${MAX_ATTACHMENT_JSON_LENGTH}.`;
const fileNotSupportedMessage =
  "This API doesn't support file attachments. To attach a file, use POST /api/cases/{case_id}/files.";

const linkedAlertIndex = 'linked_project:.alerts-security.alerts-default';
const linkedAlertReq = buildUnifiedAlertReq('securitySolutionFixture', {
  alertId: 'linked-alert',
  index: linkedAlertIndex,
});
const linkedAlertMessage = `Cannot attach an alert from a linked project or remote cluster index: ${linkedAlertIndex}`;

const alertReq = (alertId: string | string[]) =>
  buildUnifiedAlertReq('securitySolutionFixture', { alertId, index: 'test-index' });

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('attachments_crud', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should create and replace an attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      const created = await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: unifiedCommentReq,
      });
      expect(created.type).to.eql(unifiedCommentReq.type);

      const replaced = await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: created.id,
        req: { ...unifiedCommentReq, version: created.version, data: { content: 'updated' } },
      });
      expect(replaced.data?.content).to.eql('updated');
    });

    it('should reject a legacy-shaped attachment body', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: {
          type: 'user',
          comment: 'This is a cool comment',
          owner: 'securitySolutionFixture',
        } as unknown as typeof unifiedCommentReq,
        expectedHttpCode: 400,
      });
    });

    it('should reject an attachment with oversized data', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      const response = (await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: { ...unifiedCommentReq, data: oversizedData },
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.contain(dataTooLargeMessage);
    });

    it('should reject a replace with oversized data', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const created = await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: unifiedCommentReq,
      });

      const response = (await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: created.id,
        req: { ...unifiedCommentReq, version: created.version, data: oversizedData },
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.contain(dataTooLargeMessage);
    });

    it('should reject creating a file attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      const response = (await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: getUnifiedFilesAttachmentReq(),
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.be(fileNotSupportedMessage);
    });

    it('should reject replacing an attachment with a file attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const created = await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: unifiedCommentReq,
      });

      const response = (await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: created.id,
        req: { ...getUnifiedFilesAttachmentReq(), version: created.version },
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.be(fileNotSupportedMessage);
    });

    it('should reject a solution type under another solution owner', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'observabilityFixture' })
      );

      const response = (await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: { ...postUnifiedAlertReq, owner: 'observabilityFixture' },
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.be(
        `Attachment type ${SECURITY_ALERT_ATTACHMENT_TYPE} cannot be attached to a case with owner observabilityFixture.`
      );
    });

    it('should reject an alert from a linked project index', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      const response = (await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: linkedAlertReq,
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.be(linkedAlertMessage);
    });

    it('should reject a replace with an alert from a linked project index', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const created = await addAttachmentV2({
        supertest,
        caseId: postedCase.id,
        params: postUnifiedAlertReq,
      });

      const response = (await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: created.id,
        req: { ...linkedAlertReq, version: created.version },
        expectedHttpCode: 400,
      })) as unknown as { message: string };

      expect(response.message).to.be(linkedAlertMessage);
    });

    it('should replace a leftover cases-comments attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const attachmentId = await seedLegacyCommentAttachment({
        es,
        caseId: postedCase.id,
        attributes: {
          type: AttachmentType.user,
          comment: 'leftover comment',
          owner: 'securitySolutionFixture',
        },
      });
      const leftover = await getAttachmentV2({ supertest, caseId: postedCase.id, attachmentId });

      const replaced = await updateAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId,
        req: { ...unifiedCommentReq, data: { content: 'updated' }, version: leftover.version },
      });
      expect(replaced.data?.content).to.eql('updated');

      const fetched = await getAttachmentV2({ supertest, caseId: postedCase.id, attachmentId });
      expect(fetched.data?.content).to.eql('updated');
    });

    describe('replace parity with create', () => {
      const createClosedCaseWithAlert = async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { ...postCaseReq.settings, syncAlerts: false } })
        );
        const created = await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: alertReq('alert-1'),
        });
        const { version } = await getCase({ supertest, caseId: postedCase.id });
        await updateCaseStatus({
          supertest,
          caseId: postedCase.id,
          version,
          status: CaseStatuses.closed,
          expectedHttpCode: 200,
        });

        return { caseId: postedCase.id, created };
      };

      const createCaseAtAlertLimit = async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: alertReq(
            Array.from({ length: MAX_ALERTS_PER_CASE - 1 }, (_, index) => `alert-${index}`)
          ),
        });
        const created = await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: alertReq('last-alert'),
        });

        return { caseId: postedCase.id, created };
      };

      it('should reject a replace that adds an alert to a closed case', async () => {
        const { caseId, created } = await createClosedCaseWithAlert();

        const response = (await updateAttachmentV2({
          supertest,
          caseId,
          attachmentId: created.id,
          req: { ...alertReq(['alert-1', 'alert-2']), version: created.version },
          expectedHttpCode: 400,
        })) as unknown as { message: string };

        expect(response.message).to.contain('Alert cannot be attached to a closed case');
      });

      it('should replace an alert on a closed case when no alert is added', async () => {
        const { caseId, created } = await createClosedCaseWithAlert();

        await updateAttachmentV2({
          supertest,
          caseId,
          attachmentId: created.id,
          req: { ...alertReq('alert-1'), version: created.version },
        });
      });

      it('should reject a replace that pushes the case over the alert limit', async () => {
        const { caseId, created } = await createCaseAtAlertLimit();

        const response = (await updateAttachmentV2({
          supertest,
          caseId,
          attachmentId: created.id,
          req: { ...alertReq(['last-alert', 'extra-alert']), version: created.version },
          expectedHttpCode: 400,
        })) as unknown as { message: string };

        expect(response.message).to.contain(
          `Case has reached the maximum allowed number (${MAX_ALERTS_PER_CASE}) of attached alerts.`
        );
      });

      it('should replace an alert at the alert limit when the count does not grow', async () => {
        const { caseId, created } = await createCaseAtAlertLimit();

        await updateAttachmentV2({
          supertest,
          caseId,
          attachmentId: created.id,
          req: { ...alertReq('swapped-alert'), version: created.version },
        });
      });

      it('should store the updated alert total on the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const created = await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: alertReq('alert-1'),
        });

        await updateAttachmentV2({
          supertest,
          caseId: postedCase.id,
          attachmentId: created.id,
          req: { ...alertReq(['alert-1', 'alert-2']), version: created.version },
        });

        const { body } = await getSOFromKibanaIndex({
          es,
          soType: CASE_SAVED_OBJECT,
          soId: postedCase.id,
        });
        expect(body._source?.cases.total_alerts).to.be(2);
      });

      it('should replace an alert with one that has no rule name', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const created = await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: alertReq('alert-1'),
        });

        await updateAttachmentV2({
          supertest,
          caseId: postedCase.id,
          attachmentId: created.id,
          req: {
            ...buildUnifiedAlertReq('securitySolutionFixture', {
              alertId: 'alert-1',
              index: 'test-index',
              rule: { id: null, name: null },
            }),
            version: created.version,
          },
        });
      });
    });

    describe('action source', () => {
      it('records the api source for requests without the internal origin header', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const created = await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: unifiedCommentReq,
        });
        await updateAttachmentV2({
          supertest,
          caseId: postedCase.id,
          attachmentId: created.id,
          req: { ...unifiedCommentReq, data: { content: 'updated' }, version: created.version },
        });

        const { userActions } = await findCaseUserActions({
          supertest,
          caseID: postedCase.id,
          options: { sortOrder: 'asc', types: [UserActionTypes.comment] },
        });

        expect(userActions.map(({ source }) => source)).to.eql([
          userActionSourceApi,
          userActionSourceApi,
        ]);
      });

      it('records the user source for requests with the internal origin header', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await addAttachmentV2({
          supertest,
          caseId: postedCase.id,
          params: unifiedCommentReq,
          headers: { 'x-elastic-internal-origin': 'kibana' },
        });

        const { userActions } = await findCaseUserActions({
          supertest,
          caseID: postedCase.id,
          options: { types: [UserActionTypes.comment] },
        });

        expect(userActions.map(({ source }) => source)).to.eql([userActionSourceUser]);
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should create an attachment when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not create an attachment when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });

      it('should replace an attachment when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          const created = await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: superUserSpace1Auth,
          });

          await updateAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: created.id,
            req: { ...unifiedCommentReq, version: created.version },
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not replace an attachment when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          const created = await addAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: unifiedCommentReq,
            auth: superUserSpace1Auth,
          });

          await updateAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: created.id,
            req: { ...unifiedCommentReq, version: created.version },
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });
    });
  });
};
