/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { MAX_SCHEDULE_BACKFILL_BULK_SIZE } from '../../../../../../common/constants';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';

interface BulkActionScheduleRulesLimitErrorModalProps {
  onClose: () => void;
}

const BulkScheduleLimitErrorModalComponent = ({
  onClose,
}: BulkActionScheduleRulesLimitErrorModalProps) => {
  // if the amount of selected rules is more than the limit, modal window the appropriate error will be displayed
  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.BULK_SCHEDULE_BACKFILL_LIMIT_ERROR_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {i18n.BULK_SCHEDULE_BACKFILL_LIMIT_ERROR_MESSAGE(MAX_SCHEDULE_BACKFILL_BULK_SIZE)}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill>
          {i18n.BULK_SCHEDULE_BACKFILL_LIMIT_ERROR_CLOSE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const BulkScheduleLimitErrorModal = React.memo(BulkScheduleLimitErrorModalComponent);

BulkScheduleLimitErrorModal.displayName = 'BulkScheduleLimitErrorModal';
