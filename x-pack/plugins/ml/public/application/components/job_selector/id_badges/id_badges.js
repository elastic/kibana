/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { JobSelectorBadge } from '../job_selector_badge';
import { i18n } from '@kbn/i18n';

export function IdBadges({ limit, maps, onLinkClick, selectedIds, showAllBarBadges }) {
  const badges = [];
  const currentGroups = [];
  // Create group badges. Skip job ids here.
  for (let i = 0; i < selectedIds.length; i++) {
    const currentId = selectedIds[i];
    if (maps.groupsMap[currentId] !== undefined) {
      currentGroups.push(currentId);

      badges.push(
        <EuiFlexItem grow={false} key={currentId}>
          <JobSelectorBadge
            id={currentId}
            isGroup={true}
            numJobs={maps.groupsMap[currentId].length}
          />
        </EuiFlexItem>
      );
    } else {
      continue;
    }
  }
  // Create jobId badges for jobs with no groups or with groups not selected
  for (let i = 0; i < selectedIds.length; i++) {
    const currentId = selectedIds[i];
    if (maps.groupsMap[currentId] === undefined) {
      const jobGroups = maps.jobsMap[currentId] || [];

      if (jobGroups.some((g) => currentGroups.includes(g)) === false) {
        badges.push(
          <EuiFlexItem grow={false} key={currentId}>
            <JobSelectorBadge id={currentId} />
          </EuiFlexItem>
        );
      } else {
        continue;
      }
    } else {
      continue;
    }
  }

  if (showAllBarBadges || badges.length <= limit) {
    if (badges.length > limit) {
      badges.push(
        <EuiLink key="more-badges-bar-link" onClick={onLinkClick}>
          <EuiText grow={false} size="xs">
            {i18n.translate('xpack.ml.jobSelector.hideBarBadges', {
              defaultMessage: 'Hide',
            })}
          </EuiText>
        </EuiLink>
      );
    }

    return badges;
  } else {
    const overFlow = badges.length - limit;

    badges.splice(limit);
    badges.push(
      <EuiLink key="more-badges-bar-link" onClick={onLinkClick}>
        <EuiText grow={false} size="xs">
          {i18n.translate('xpack.ml.jobSelector.showBarBadges', {
            defaultMessage: `And {overFlow} more`,
            values: { overFlow },
          })}
        </EuiText>
      </EuiLink>
    );

    return badges;
  }
}
IdBadges.propTypes = {
  limit: PropTypes.number,
  maps: PropTypes.shape({
    jobsMap: PropTypes.object,
    groupsMap: PropTypes.object,
  }),
  onLinkClick: PropTypes.func,
  selectedIds: PropTypes.array,
  showAllBarBadges: PropTypes.bool,
};
