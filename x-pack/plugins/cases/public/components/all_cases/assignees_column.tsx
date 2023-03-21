/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { Case } from '../../../common/ui/types';
import { getEmptyTagValue } from '../empty_value';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { useAssignees } from '../../containers/user_profiles/use_assignees';
import { getUsernameDataTestSubj } from '../user_profiles/data_test_subject';
import { SmallUserAvatar } from '../user_profiles/small_user_avatar';
import * as i18n from './translations';

const COMPRESSED_AVATAR_LIMIT = 3;

export interface AssigneesColumnProps {
  assignees: Case['assignees'];
  userProfiles: Map<string, UserProfileWithAvatar>;
  compressedDisplayLimit?: number;
}

const AssigneesColumnComponent: React.FC<AssigneesColumnProps> = ({
  assignees,
  userProfiles,
  compressedDisplayLimit = COMPRESSED_AVATAR_LIMIT,
}) => {
  const [isAvatarListExpanded, setIsAvatarListExpanded] = useState<boolean>(false);

  const { allAssignees } = useAssignees({
    caseAssignees: assignees,
    userProfiles,
  });

  const toggleExpandedAvatars = useCallback(
    () => setIsAvatarListExpanded((prevState) => !prevState),
    []
  );

  const numHiddenAvatars = allAssignees.length - compressedDisplayLimit;
  const shouldShowExpandListButton = numHiddenAvatars > 0;

  const limitedAvatars = useMemo(
    () => allAssignees.slice(0, compressedDisplayLimit),
    [allAssignees, compressedDisplayLimit]
  );

  const avatarsToDisplay = useMemo(() => {
    if (isAvatarListExpanded || !shouldShowExpandListButton) {
      return allAssignees;
    }

    return limitedAvatars;
  }, [allAssignees, isAvatarListExpanded, limitedAvatars, shouldShowExpandListButton]);

  if (allAssignees.length <= 0) {
    return getEmptyTagValue();
  }

  return (
    <EuiFlexGroup gutterSize="xs" data-test-subj="case-table-column-assignee" wrap>
      {avatarsToDisplay.map((assignee) => {
        const dataTestSubjName = getUsernameDataTestSubj(assignee);
        return (
          <EuiFlexItem
            grow={false}
            key={assignee.uid}
            data-test-subj={`case-table-column-assignee-${dataTestSubjName}`}
          >
            <UserToolTip userInfo={assignee.profile}>
              <SmallUserAvatar userInfo={assignee.profile} />
            </UserToolTip>
          </EuiFlexItem>
        );
      })}

      {shouldShowExpandListButton ? (
        <EuiButtonEmpty
          size="xs"
          data-test-subj="case-table-column-expand-button"
          onClick={toggleExpandedAvatars}
          style={{ alignSelf: 'center' }}
        >
          {isAvatarListExpanded ? i18n.SHOW_LESS : i18n.SHOW_MORE(numHiddenAvatars)}
        </EuiButtonEmpty>
      ) : null}
    </EuiFlexGroup>
  );
};

AssigneesColumnComponent.displayName = 'AssigneesColumn';

export const AssigneesColumn = React.memo(AssigneesColumnComponent);
