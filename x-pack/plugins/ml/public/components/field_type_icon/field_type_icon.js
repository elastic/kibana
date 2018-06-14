/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiToolTip } from '@elastic/eui';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { ML_JOB_FIELD_TYPES } from '../../../common/constants/field_types';

export function FieldTypeIcon({ tooltipEnabled = false, type }) {
  let ariaLabel = '';
  let iconClass = '';
  let iconChar = '';

  switch (type) {
    case ML_JOB_FIELD_TYPES.BOOLEAN:
      ariaLabel = 'Boolean field';
      iconClass = 'fa-adjust';
      break;
    case ML_JOB_FIELD_TYPES.DATE:
      ariaLabel = 'Date field';
      iconClass = 'fa-clock-o';
      break;
    case ML_JOB_FIELD_TYPES.NUMBER:
      ariaLabel = 'Metric field';
      iconChar = '#';
      break;
    case ML_JOB_FIELD_TYPES.GEO_POINT:
      ariaLabel = 'Geo-point field';
      iconClass = 'fa-globe';
      break;
    case ML_JOB_FIELD_TYPES.KEYWORD:
      ariaLabel = 'Aggregatable string field';
      iconChar = 't';
      break;
    case ML_JOB_FIELD_TYPES.TEXT:
      ariaLabel = 'String field';
      iconClass = 'fa-file-text-o';
      break;
    case ML_JOB_FIELD_TYPES.IP:
      ariaLabel = 'IP address field';
      iconClass = 'fa-laptop';
      break;
    default:
      // if type doesn't match one of ML_JOB_FIELD_TYPES
      // don't render the component at all
      return null;
  }

  let className = 'field-type-icon';
  if (iconClass !== '') {
    className += ' kuiIcon ' + iconClass;
  }

  const containerProps = {
    ariaLabel,
    className,
    iconChar
  };

  if (tooltipEnabled === true) {
    // wrap the inner component inside <span> because EuiToolTip doesn't seem
    // to support having another component directly inside the tooltip anchor
    // see https://github.com/elastic/eui/issues/839
    return (
      <EuiToolTip position="left" content={type}>
        <FieldTypeIconContainer {...containerProps} />
      </EuiToolTip>
    );
  }

  return <FieldTypeIconContainer {...containerProps} />;
}
FieldTypeIcon.propTypes = {
  tooltipEnabled: PropTypes.bool,
  type: PropTypes.string
};

// If the tooltip is used, it will apply its events to its first inner child.
// To pass on its properties we apply `rest` to the outer `span` element.
function FieldTypeIconContainer({ ariaLabel, className, iconChar, ...rest }) {
  return (
    <span className="field-type-icon-container" {...rest} >
      {(iconChar === '') ? (
        <span aria-label={ariaLabel} className={className} />
      ) : (
        <span aria-label={ariaLabel} className={className}>
          <strong aria-hidden="true">{iconChar}</strong>
        </span>
      )}
    </span>
  );
}
