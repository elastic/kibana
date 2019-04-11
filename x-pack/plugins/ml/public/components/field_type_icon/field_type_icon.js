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
import { getMLJobTypeAriaLabel } from '../../util/field_types_utils';
import { i18n } from '@kbn/i18n';

export const FieldTypeIcon = ({ tooltipEnabled = false, type, needsAria = true }) => {
  const ariaLabel = getMLJobTypeAriaLabel(type);

  if (!ariaLabel) {
    // if type doesn't match one of ML_JOB_FIELD_TYPES
    // don't render the component at all
    return null;
  }

  const iconClass = ['field-type-icon'];
  let iconChar = '';

  switch (type) {

    // icon class names
    case 'boolean':
      iconClass.push('kuiIcon', 'fa-adjust');
      break;
    case 'date':
      iconClass.push('kuiIcon', 'fa-clock-o');
      break;
    case 'geo_point':
      iconClass.push('kuiIcon', 'fa-globe');
      break;
    case 'text':
      iconClass.push('kuiIcon', 'fa-file-text-o');
      break;
    case 'ip':
      iconClass.push('kuiIcon', 'fa-laptop');
      break;

    // icon chars
    case 'keyword':
      iconChar = 't';
      break;
    case 'number':
      iconChar = '#';
      break;
    case 'Unknown':
      iconChar = '?';
      break;
  }

  const containerProps = {
    ariaLabel,
    className: iconClass.join(' '),
    iconChar,
    needsAria
  };

  if (tooltipEnabled === true) {
    // wrap the inner component inside <span> because EuiToolTip doesn't seem
    // to support having another component directly inside the tooltip anchor
    // see https://github.com/elastic/eui/issues/839
    return (
      <EuiToolTip
        position="left"
        content={i18n.translate('xpack.ml.fieldTypeIcon.fieldTypeTooltip', {
          defaultMessage: '{type} type',
          values: { type }
        })}
      >
        <FieldTypeIconContainer {...containerProps} />
      </EuiToolTip>
    );
  }

  return <FieldTypeIconContainer {...containerProps} />;
};

FieldTypeIcon.propTypes = {
  tooltipEnabled: PropTypes.bool,
  type: PropTypes.string
};

// If the tooltip is used, it will apply its events to its first inner child.
// To pass on its properties we apply `rest` to the outer `span` element.
function FieldTypeIconContainer({
  ariaLabel,
  className,
  iconChar,
  needsAria,
  ...rest
}) {

  const wrapperProps = { className };
  if (needsAria && ariaLabel) {
    wrapperProps['aria-label'] = ariaLabel;
  }

  return (
    <span className="field-type-icon-container" {...rest}>
      {(iconChar === '') ? (
        <span {...wrapperProps} />
      ) : (
        <span {...wrapperProps}>
          <strong aria-hidden="true">{iconChar}</strong>
        </span>
      )}
    </span>
  );
}
