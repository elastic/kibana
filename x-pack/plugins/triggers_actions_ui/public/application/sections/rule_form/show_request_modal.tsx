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
import { i18n } from '@kbn/i18n';
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
    return i18n.translate(
      'xpack.triggersActionsUI.sections.showRequestModal.somethingWentWrongDescription',
      {
        defaultMessage: 'Sorry about that, something went wrong.',
      }
    );
  }
};

const EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleEdit',
  {
    defaultMessage: 'edit',
  }
);
const CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitleCreate',
  {
    defaultMessage: 'create',
  }
);
const HEADER_EDIT = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleEdit',
  {
    defaultMessage: 'Edit',
  }
);
const HEADER_CREATE = i18n.translate(
  'xpack.triggersActionsUI.sections.showRequestModal.headerTitleCreate',
  {
    defaultMessage: 'Create',
  }
);

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
              {i18n.translate('xpack.triggersActionsUI.sections.showRequestModal.headerTitle', {
                defaultMessage: '{requestType} alerting rule request',
                values: { requestType: edit ? HEADER_EDIT : HEADER_CREATE },
              })}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="modalSubheadingTitle">
              <p>
                <EuiTextColor color="subdued">
                  {i18n.translate(
                    'xpack.triggersActionsUI.sections.showRequestModal.subheadingTitle',
                    {
                      defaultMessage: 'This elasticsearch request will {requestType} this rule.',
                      values: { requestType: edit ? EDIT : CREATE },
                    }
                  )}
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock language="json" isCopyable data-test-subj="modalRequestCodeBlock">
          {`${edit ? 'PUT' : 'POST'} kbn:${BASE_ALERTING_API_PATH}/rule${
            edit ? ruleId : ''
          }\n${formattedRequest}`}
        </EuiCodeBlock>
      </EuiModalBody>
    </EuiModal>
  );
};
