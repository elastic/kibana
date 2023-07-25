/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';

import {
  CommentAttributesBasicRt,
  CommentType,
  ContextTypeUserRt,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
  ExternalReferenceStorageType,
  ExternalReferenceRt,
  PersistableStateAttachmentRt,
  CommentRequestRt,
  CommentRt,
  CommentResponseTypeUserRt,
  CommentResponseTypeAlertsRt,
  CommentResponseTypeActionsRt,
  CommentResponseTypeExternalReferenceRt,
  CommentResponseTypePersistableStateRt,
  CommentPatchRequestRt,
  CommentPatchAttributesRt,
  CommentsFindResponseRt,
  FindCommentsQueryParamsRt,
  BulkCreateCommentRequestRt,
  BulkGetAttachmentsRequestRt,
  BulkGetAttachmentsResponseRt,
} from '.';
import { MAX_COMMENT_LENGTH, MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';

describe('Comments', () => {
  describe('CommentAttributesBasicRt', () => {
    const defaultRequest = {
      created_at: '2019-11-25T22:32:30.608Z',
      created_by: {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
      owner: 'cases',
      updated_at: null,
      updated_by: null,
      pushed_at: null,
      pushed_by: null,
    };

    it('has expected attributes in request', () => {
      const query = CommentAttributesBasicRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentAttributesBasicRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ContextTypeUserRt', () => {
    const defaultRequest = {
      comment: 'This is a sample comment',
      type: CommentType.user,
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = ContextTypeUserRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ContextTypeUserRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('AlertCommentRequestRt', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: CommentType.alert,
      owner: 'cases',
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
    };

    it('has expected attributes in request', () => {
      const query = AlertCommentRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AlertCommentRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from rule', () => {
      const query = AlertCommentRequestRt.decode({
        ...defaultRequest,
        rule: { id: 'rule-id-1', name: 'Awesome rule', foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ActionsCommentRequestRt', () => {
    const defaultRequest = {
      type: CommentType.actions,
      comment: 'I just isolated the host!',
      actions: {
        targets: [
          {
            hostname: 'host1',
            endpointId: '001',
          },
        ],
        type: 'isolate',
      },
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = ActionsCommentRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ActionsCommentRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from actions', () => {
      const query = ActionsCommentRequestRt.decode({
        ...defaultRequest,
        actions: {
          targets: [
            {
              hostname: 'host1',
              endpointId: '001',
            },
          ],
          type: 'isolate',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from targets', () => {
      const query = ActionsCommentRequestRt.decode({
        ...defaultRequest,
        actions: {
          targets: [
            {
              hostname: 'host1',
              endpointId: '001',
              foo: 'bar',
            },
          ],
          type: 'isolate',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ExternalReferenceRt', () => {
    const defaultRequest = {
      type: CommentType.externalReference,
      externalReferenceId: 'my-id',
      externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
      externalReferenceAttachmentTypeId: '.test',
      externalReferenceMetadata: { test_foo: 'foo' },
      owner: 'cases',
    };
    it('has expected attributes in request', () => {
      const query = ExternalReferenceRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ExternalReferenceRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalReferenceStorage', () => {
      const query = ExternalReferenceRt.decode({
        ...defaultRequest,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.elasticSearchDoc,
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from externalReferenceStorage with soType', () => {
      const query = ExternalReferenceRt.decode({
        ...defaultRequest,
        externalReferenceStorage: {
          type: ExternalReferenceStorageType.savedObject,
          soType: 'awesome',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          externalReferenceStorage: {
            type: ExternalReferenceStorageType.savedObject,
            soType: 'awesome',
          },
        },
      });
    });
  });

  describe('PersistableStateAttachmentRt', () => {
    const defaultRequest = {
      type: CommentType.persistableState,
      persistableStateAttachmentState: { test_foo: 'foo' },
      persistableStateAttachmentTypeId: '.test',
      owner: 'cases',
    };
    it('has expected attributes in request', () => {
      const query = PersistableStateAttachmentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = PersistableStateAttachmentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from persistableStateAttachmentState', () => {
      const query = PersistableStateAttachmentRt.decode({
        ...defaultRequest,
        persistableStateAttachmentState: { test_foo: 'foo', foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          ...defaultRequest,
          persistableStateAttachmentState: { test_foo: 'foo', foo: 'bar' },
        },
      });
    });
  });

  describe('CommentRequestRt', () => {
    const defaultRequest = {
      comment: 'Solve this fast!',
      type: CommentType.user,
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = CommentRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    describe('errors', () => {
      describe('commentType: user', () => {
        it('throws error when comment is too long', () => {
          const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 1);

          expect(
            PathReporter.report(
              CommentRequestRt.decode({ ...defaultRequest, comment: longComment })
            )
          ).toContain('The length of the comment is too long. The maximum length is 30000.');
        });

        it('throws error when comment is empty', () => {
          expect(
            PathReporter.report(CommentRequestRt.decode({ ...defaultRequest, comment: '' }))
          ).toContain('The comment field cannot be an empty string.');
        });

        it('throws error when comment string of empty characters', () => {
          expect(
            PathReporter.report(CommentRequestRt.decode({ ...defaultRequest, comment: '   ' }))
          ).toContain('The comment field cannot be an empty string.');
        });
      });

      describe('commentType: action', () => {
        const request = {
          type: CommentType.actions,
          actions: {
            targets: [
              {
                hostname: 'host1',
                endpointId: '001',
              },
            ],
            type: 'isolate',
          },
          owner: 'cases',
        };

        it('throws error when comment is too long', () => {
          const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 1);

          expect(
            PathReporter.report(CommentRequestRt.decode({ ...request, comment: longComment }))
          ).toContain('The length of the comment is too long. The maximum length is 30000.');
        });

        it('throws error when comment is empty', () => {
          expect(
            PathReporter.report(CommentRequestRt.decode({ ...request, comment: '' }))
          ).toContain('The comment field cannot be an empty string.');
        });

        it('throws error when comment string of empty characters', () => {
          expect(
            PathReporter.report(CommentRequestRt.decode({ ...request, comment: '   ' }))
          ).toContain('The comment field cannot be an empty string.');
        });
      });
    });
  });

  describe('CommentRt', () => {
    const defaultRequest = {
      comment: 'Solve this fast!',
      type: CommentType.user,
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentResponseTypeUserRt', () => {
    const defaultRequest = {
      comment: 'Solve this fast!',
      type: CommentType.user,
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentResponseTypeUserRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentResponseTypeUserRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentResponseTypeAlertsRt', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: CommentType.alert,
      id: 'alert-comment-id',
      owner: 'cases',
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentResponseTypeAlertsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentResponseTypeAlertsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from created_by', () => {
      const query = CommentResponseTypeAlertsRt.decode({
        ...defaultRequest,
        created_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentResponseTypeActionsRt', () => {
    const defaultRequest = {
      type: CommentType.actions,
      comment: 'I just isolated the host!',
      actions: {
        targets: [
          {
            hostname: 'host1',
            endpointId: '001',
          },
        ],
        type: 'isolate',
      },
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentResponseTypeActionsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentResponseTypeActionsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentResponseTypeExternalReferenceRt', () => {
    const defaultRequest = {
      type: CommentType.externalReference,
      externalReferenceId: 'my-id',
      externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
      externalReferenceAttachmentTypeId: '.test',
      externalReferenceMetadata: { test_foo: 'foo' },
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentResponseTypeExternalReferenceRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentResponseTypeExternalReferenceRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentResponseTypePersistableStateRt', () => {
    const defaultRequest = {
      type: CommentType.persistableState,
      persistableStateAttachmentState: { test_foo: 'foo' },
      persistableStateAttachmentTypeId: '.test',
      owner: 'cases',
      id: 'basic-comment-id',
      version: 'WzQ3LDFc',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
    it('has expected attributes in request', () => {
      const query = CommentResponseTypePersistableStateRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentResponseTypePersistableStateRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentPatchRequestRt', () => {
    const defaultRequest = {
      alertId: 'alert-id-1',
      index: 'alert-index-1',
      type: CommentType.alert,
      id: 'alert-comment-id',
      owner: 'cases',
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
      version: 'WzQ3LDFc',
    };
    it('has expected attributes in request', () => {
      const query = CommentPatchRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentPatchRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentPatchAttributesRt', () => {
    const defaultRequest = {
      type: CommentType.actions,
      actions: {
        targets: [
          {
            hostname: 'host1',
            endpointId: '001',
          },
        ],
        type: 'isolate',
      },
      owner: 'cases',
    };
    it('has expected attributes in request', () => {
      const query = CommentPatchAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentPatchAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CommentsFindResponseRt', () => {
    const defaultRequest = {
      comments: [
        {
          comment: 'Solve this fast!',
          type: CommentType.user,
          owner: 'cases',
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
          id: 'basic-comment-id',
          version: 'WzQ3LDFc',
        },
      ],
      page: 1,
      per_page: 10,
      total: 1,
    };
    it('has expected attributes in request', () => {
      const query = CommentsFindResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentsFindResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from comments', () => {
      const query = CommentsFindResponseRt.decode({
        ...defaultRequest,
        comments: [{ ...defaultRequest.comments[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('FindCommentsQueryParamsRt', () => {
    const defaultRequest = {
      page: 1,
      perPage: 10,
      sortOrder: 'asc',
    };

    it('has expected attributes in request', () => {
      const query = FindCommentsQueryParamsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = FindCommentsQueryParamsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('BulkCreateCommentRequestRt', () => {
    const defaultRequest = [
      {
        comment: 'Solve this fast!',
        type: CommentType.user,
        owner: 'cases',
      },
    ];

    it('has expected attributes in request', () => {
      const query = BulkCreateCommentRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = BulkCreateCommentRequestRt.decode([
        { comment: 'Solve this fast!', type: CommentType.user, owner: 'cases', foo: 'bar' },
      ]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    describe('errors', () => {
      it(`throws error when attachments are more than ${MAX_BULK_CREATE_ATTACHMENTS}`, () => {
        const comment = {
          comment: 'Solve this fast!',
          type: CommentType.user,
          owner: 'cases',
        };
        const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(comment);

        expect(PathReporter.report(BulkCreateCommentRequestRt.decode(attachments))).toContain(
          `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
        );
      });

      it(`no errors when empty array of attachments`, () => {
        expect(PathReporter.report(BulkCreateCommentRequestRt.decode([]))).toStrictEqual([
          'No errors!',
        ]);
      });
    });
  });

  describe('BulkGetAttachmentsRequestRt', () => {
    it('has expected attributes in request', () => {
      const query = BulkGetAttachmentsRequestRt.decode({ ids: ['abc', 'xyz'] });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ids: ['abc', 'xyz'] },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = BulkGetAttachmentsRequestRt.decode({ ids: ['abc', 'xyz'], foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ids: ['abc', 'xyz'] },
      });
    });
  });

  describe('BulkGetAttachmentsResponseRt', () => {
    const defaultRequest = {
      attachments: [
        {
          comment: 'Solve this fast!',
          type: CommentType.user,
          owner: 'cases',
          id: 'basic-comment-id',
          version: 'WzQ3LDFc',
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      ],
      errors: [
        {
          error: 'error',
          message: 'not found',
          status: 404,
          attachmentId: 'abc',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const query = BulkGetAttachmentsResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = BulkGetAttachmentsResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from attachments', () => {
      const query = BulkGetAttachmentsResponseRt.decode({
        ...defaultRequest,
        attachments: [{ ...defaultRequest.attachments[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from errors', () => {
      const query = BulkGetAttachmentsResponseRt.decode({
        ...defaultRequest,
        errors: [{ ...defaultRequest.errors[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
