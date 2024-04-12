/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { pick } from 'lodash';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiCodeBlock,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from '../translations';
import { RuleUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { rewriteBodyRequest as rewriteCreateBodyRequest } from '../../lib/rule_api/create';
import {
  rewriteBodyRequest as rewriteUpdateBodyRequest,
  UPDATE_FIELDS,
} from '../../lib/rule_api/update';

const stringify = (rule: RuleUpdates, edit: boolean): string => {
  try {
    const request = edit
      ? rewriteUpdateBodyRequest(pick(rule, UPDATE_FIELDS))
      : rewriteCreateBodyRequest(rule);
    return JSON.stringify(request, null, 2);
  } catch {
    return i18n.SHOW_REQUEST_MODAL_ERROR;
  }
};

export interface ShowRequestModalProps {
  onClose: () => void;
  rule: RuleUpdates;
  ruleId?: string;
  edit?: boolean;
}

export const ShowRequestModal: React.FC<ShowRequestModalProps> = ({
  onClose,
  rule,
  edit = false,
  ruleId,
}) => {
  const formattedRequest = stringify(rule, edit);

  return (
    <EuiModal aria-labelledby="showRequestModal" onClose={onClose}>
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="showRequestModal" data-test-subj="modalHeaderTitle">
              {i18n.SHOW_REQUEST_MODAL_TITLE(edit)}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="modalSubtitle">
              <p>
                <EuiTextColor color="subdued">
                  {i18n.SHOW_REQUEST_MODAL_SUBTITLE(edit)}
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock language="json" isCopyable data-test-subj="modalRequestCodeBlock">
          {`${edit ? 'PUT' : 'POST'} kbn:${BASE_ALERTING_API_PATH}/rule${
            edit ? `/${ruleId}` : ''
          }\n${formattedRequest}`}
        </EuiCodeBlock>
      </EuiModalBody>
    </EuiModal>
  );
};
