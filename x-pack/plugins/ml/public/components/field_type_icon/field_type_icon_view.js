/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiToolTip } from '@elastic/eui';

export function FieldTypeIcon({ ML_JOB_FIELD_TYPES, tooltipEnabled, type }) {
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

  if (tooltipEnabled) {
    return (
      <EuiToolTip content={type}>
        <FieldTypeIconContainer {...containerProps} />
      </EuiToolTip>
    );
  }

  return <FieldTypeIconContainer {...containerProps} />;
}
FieldTypeIcon.propTypes = {
  ML_JOB_FIELD_TYPES: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired
};

function FieldTypeIconContainer({ ariaLabel, className, iconChar }) {
  return (
    <span className="field-type-icon-container">
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
