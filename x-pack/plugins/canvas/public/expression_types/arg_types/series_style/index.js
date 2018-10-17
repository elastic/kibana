/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle } from 'recompose';
import { get } from 'lodash';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';

const EnhancedExtendedTemplate = lifecycle({
  formatLabel(label) {
    if (typeof label !== 'string') this.props.renderError();
    return (
      <FormattedMessage
        id="xpack.canvas.expressionTypes.seriesStyle.styleLabel"
        defaultMessage="Style: {label}"
        values={{ label }}
      />
    );
  },
  componentWillMount() {
    const label = get(this.props.argValue, 'chain.0.arguments.label.0', '');
    if (label) this.props.setLabel(this.formatLabel(label));
  },
  componentWillReceiveProps(newProps) {
    const newLabel = get(newProps.argValue, 'chain.0.arguments.label.0', '');
    if (newLabel && this.props.label !== this.formatLabel(newLabel))
      this.props.setLabel(this.formatLabel(newLabel));
  },
})(ExtendedTemplate);

EnhancedExtendedTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

const seriesStyleUI = intl => ({
  name: 'seriesStyle',
  displayName: intl.formatMessage({
    id: 'xpack.canvas.expressionTypes.seriesStyleDisplayName',
    defaultMessage: 'Series style',
  }),
  help: intl.formatMessage({
    id: 'xpack.canvas.expressionTypes.seriesStyleHelpText',
    defaultMessage: 'Set the style for a selected named series',
  }),
  template: templateFromReactComponent(EnhancedExtendedTemplate),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  default: '{seriesStyle}',
});

export const seriesStyle = injectI18n(seriesStyleUI);
