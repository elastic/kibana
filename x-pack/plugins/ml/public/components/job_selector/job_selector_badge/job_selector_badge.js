/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiBadge } from '@elastic/eui';
import { tabColor } from '../../../../common/util/group_color_utils';
import { i18n } from '@kbn/i18n';

export function JobSelectorBadge({
  icon,
  id,
  isGroup = false,
  numJobs,
  removeId
}) {
  const color = isGroup ? tabColor(id) : 'hollow';
  let props = { color };
  let jobCount;

  if (icon === true) {
    props = {
      ...props,
      iconType: 'cross',
      iconSide: 'right',
      onClick: () => removeId(id),
      onClickAriaLabel: 'Remove id'
    };
  }

  if (numJobs !== undefined) {
    jobCount = i18n.translate('xpack.ml.jobSelector.selectedGroupJobs', {
      defaultMessage: `({jobsCount, plural, one {# job} other {# jobs}})`,
      values: { jobsCount: numJobs },
    });
  }

  return (
    <EuiBadge key={`${id}-id`} {...props} >
      {`${id}${jobCount ? jobCount : ''}`}
    </EuiBadge>
  );
}
JobSelectorBadge.propTypes = {
  icon: PropTypes.bool,
  id: PropTypes.string.isRequired,
  isGroup: PropTypes.bool,
  numJobs: PropTypes.number,
  removeId: PropTypes.func
};
