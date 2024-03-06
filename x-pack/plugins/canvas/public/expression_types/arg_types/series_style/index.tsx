/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate, Props as ExtendedTemplateProps } from './extended_template';
import { ExpressionAstExpression } from '../../../../types';
import { ArgTypesStrings } from '../../../../i18n';

const { SeriesStyle: strings } = ArgTypesStrings;

interface Props {
  argValue: ExpressionAstExpression;
  renderError: Function;
  setLabel: Function;
  label: string;
}

const formatLabel = (label: string, props: Props) => {
  if (typeof label !== 'string') {
    props.renderError();
  }
  return `${strings.getStyleLabel()}: ${label}`;
};

const EnhancedExtendedTemplate = (props: Props & ExtendedTemplateProps) => {
  useEffect(() => {
    const label = get(props.argValue, 'chain.0.arguments.label.0', '');
    if (label && props.label !== formatLabel(label, props)) {
      props.setLabel(formatLabel(label, props));
    }
  }, [props]);

  return <ExtendedTemplate {...props} />;
};

EnhancedExtendedTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export const seriesStyle = () => ({
  name: 'seriesStyle',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(EnhancedExtendedTemplate),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  default: '{seriesStyle}',
});
