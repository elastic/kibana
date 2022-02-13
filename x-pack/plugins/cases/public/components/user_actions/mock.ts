/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { basicCase, basicPush, getUserAction } from '../../containers/mock';
import { UserActionBuilderArgs } from './types';

export const getMockBuilderArgs = (): UserActionBuilderArgs => {
  const userAction = getUserAction('title', Actions.update);
  const commentRefs = { current: {} };
  const caseServices = {
    '123': {
      ...basicPush,
      firstPushIndex: 0,
      lastPushIndex: 0,
      commentsToUpdate: [],
      hasDataToPush: true,
    },
  };

  const alertData = {
    'alert-id-1': {
      _id: 'alert-id-1',
      _index: 'alert-index-1',
      signal: {
        rule: {
          id: ['rule-id-1'],
          name: ['Awesome rule'],
          false_positives: [],
        },
      },
      kibana: {
        alert: {
          rule: {
            uuid: ['rule-id-1'],
            name: ['Awesome rule'],
            false_positives: [],
            parameters: {},
          },
        },
      },
      owner: SECURITY_SOLUTION_OWNER,
    },
  };

  const getRuleDetailsHref = jest.fn().mockReturnValue('https://example.com');
  const onRuleDetailsClick = jest.fn();
  const onShowAlertDetails = jest.fn();
  const handleManageMarkdownEditId = jest.fn();
  const handleSaveComment = jest.fn();
  const handleManageQuote = jest.fn();
  const handleOutlineComment = jest.fn();

  return {
    userAction,
    caseData: basicCase,
    comments: basicCase.comments,
    caseServices,
    index: 0,
    alertData,
    userCanCrud: true,
    commentRefs,
    manageMarkdownEditIds: [],
    selectedOutlineCommentId: '',
    loadingCommentIds: [],
    loadingAlertData: false,
    getRuleDetailsHref,
    onRuleDetailsClick,
    onShowAlertDetails,
    handleManageMarkdownEditId,
    handleSaveComment,
    handleManageQuote,
    handleOutlineComment,
  };
};
