/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiText,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';

import * as i18n from './translations';
import { SuggestUsers } from '../user_profiles/suggest_users';

interface AssignUsersProps {
  assignees: Array<{ uid: string }>;
}

const AssignUsersComponent: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopOver = useCallback(() => {
    setIsPopoverOpen((value) => !value);
  }, []);

  const onClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const button = (
    <EuiButtonIcon
      data-test-subj="assignees-edit-button"
      aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
      iconType={'pencil'}
      onClick={togglePopOver}
    />
  );

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{i18n.ASSIGNEES}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="assignees-edit" grow={false}>
          <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={onClosePopover}
            anchorPosition="downRight"
            panelStyle={{
              minWidth: 520,
            }}
          >
            <SuggestUsers />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>{i18n.NO_ASSIGNEES}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <EuiLink>{'Assign a user'}</EuiLink>
            <span>{'or'}</span>
            <EuiLink>{'Assign yourself'}</EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AssignUsersComponent.displayName = 'AssignUsers';

export const AssignUsers = React.memo(AssignUsersComponent);
