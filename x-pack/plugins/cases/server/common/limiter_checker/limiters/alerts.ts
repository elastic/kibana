/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentService } from '../../../services';
import { CommentType } from '../../../../common/api';
import type { CommentRequest, CommentRequestAlertType } from '../../../../common/api';
import { CASE_COMMENT_SAVED_OBJECT, MAX_ALERTS_PER_CASE } from '../../../../common/constants';
import { isCommentRequestTypeAlert } from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class AlertLimiter extends BaseLimiter {
  constructor(private readonly attachmentService: AttachmentService) {
    super({
      limit: MAX_ALERTS_PER_CASE,
      attachmentType: CommentType.alert,
      attachmentNoun: 'alerts',
      field: 'alertId',
    });
  }

  public async countOfItemsWithinCase(caseId: string): Promise<number> {
    const limitAggregation = {
      limiter: {
        value_count: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.alertId`,
        },
      },
    };

    const itemsAttachedToCase = await this.attachmentService.executeCaseAggregations<{
      limiter: { value: number };
    }>({
      caseId,
      aggregations: limitAggregation,
      attachmentType: CommentType.alert,
    });

    return itemsAttachedToCase?.limiter?.value ?? 0;
  }

  public countOfItemsInRequest(requests: CommentRequest[]): number {
    const totalAlertsInReq = requests
      .filter<CommentRequestAlertType>(isCommentRequestTypeAlert)
      .reduce((count, attachment) => {
        const ids = Array.isArray(attachment.alertId) ? attachment.alertId : [attachment.alertId];
        return count + ids.length;
      }, 0);

    return totalAlertsInReq;
  }
}
