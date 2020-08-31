/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiBadge, EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { tabColor } from '../../../../../common/util/group_color_utils';

interface JobSelectorBadgeProps {
  icon?: boolean;
  id: string;
  isGroup?: boolean;
  numJobs?: number;
  removeId?: Function;
}

export const JobSelectorBadge: FC<JobSelectorBadgeProps> = ({
  icon,
  id,
  isGroup = false,
  numJobs,
  removeId,
}) => {
  const color = isGroup ? tabColor(id) : 'hollow';
  let props = { color } as EuiBadgeProps;
  let jobCount;

  if (icon === true && removeId) {
    // @ts-ignore
    props = {
      ...props,
      iconType: 'cross',
      iconSide: 'right',
      onClick: () => removeId(id),
      onClickAriaLabel: 'Remove id',
    };
  }

  if (numJobs !== undefined) {
    jobCount = i18n.translate('xpack.ml.jobSelector.selectedGroupJobs', {
      defaultMessage: `({jobsCount, plural, one {# job} other {# jobs}})`,
      values: { jobsCount: numJobs },
    });
  }

  return (
    <EuiBadge key={`${id}-id`} data-test-subj={`mlJobSelectionBadge ${id}`} {...props}>
      {`${id}${jobCount ? jobCount : ''}`}
    </EuiBadge>
  );
};
