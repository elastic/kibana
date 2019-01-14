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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const FieldTypeIcon = injectI18n(function FieldTypeIcon({ tooltipEnabled = false, type, intl }) {
  let ariaLabel = '';
  let iconClass = '';
  let iconChar = '';

  switch (type) {
    case ML_JOB_FIELD_TYPES.BOOLEAN:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.booleanTypeAriaLabel',
        defaultMessage: 'boolean type'
      });
      iconClass = 'fa-adjust';
      break;
    case ML_JOB_FIELD_TYPES.DATE:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.dateTypeAriaLabel',
        defaultMessage: 'date type'
      });
      iconClass = 'fa-clock-o';
      break;
    case ML_JOB_FIELD_TYPES.NUMBER:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.numberTypeAriaLabel',
        defaultMessage: 'number type'
      });
      iconChar = '#';
      break;
    case ML_JOB_FIELD_TYPES.GEO_POINT:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.geoPointTypeAriaLabel',
        defaultMessage: '{geoPointParam} type'
      }, { geoPointParam: 'geo_point' });
      iconClass = 'fa-globe';
      break;
    case ML_JOB_FIELD_TYPES.KEYWORD:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.keywordTypeAriaLabel',
        defaultMessage: 'keyword type'
      });
      iconChar = 't';
      break;
    case ML_JOB_FIELD_TYPES.TEXT:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.textTypeAriaLabel',
        defaultMessage: 'text type'
      });
      iconClass = 'fa-file-text-o';
      break;
    case ML_JOB_FIELD_TYPES.IP:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.ipTypeAriaLabel',
        defaultMessage: 'IP type'
      });
      iconClass = 'fa-laptop';
      break;
    case ML_JOB_FIELD_TYPES.UNKNOWN:
      ariaLabel = intl.formatMessage({
        id: 'xpack.ml.fieldTypeIcon.unknownTypeAriaLabel',
        defaultMessage: 'Unknown type'
      });
      iconChar = '?';
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
      <EuiToolTip
        position="left"
        content={<FormattedMessage
          id="xpack.ml.fieldTypeIcon.fieldTypeTooltip"
          defaultMessage="{type} type"
          values={{ type }}
        />}
      >
        <FieldTypeIconContainer {...containerProps} />
      </EuiToolTip>
    );
  }

  return <FieldTypeIconContainer {...containerProps} />;
});
FieldTypeIcon.WrappedComponent.propTypes = {
  tooltipEnabled: PropTypes.bool,
  type: PropTypes.string
};

// If the tooltip is used, it will apply its events to its first inner child.
// To pass on its properties we apply `rest` to the outer `span` element.
function FieldTypeIconContainer({ ariaLabel, className, iconChar, ...rest }) {
  return (
    <span className="field-type-icon-container" {...rest} tabIndex="0">
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
