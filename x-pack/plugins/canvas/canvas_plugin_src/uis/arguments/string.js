/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { EuiFlexItem, EuiFlexGroup, EuiFieldText, EuiButton } from '@elastic/eui';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../../public/components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { String: strings } = ArgumentStrings;

const StringArgInput = ({ updateValue, value, confirm, commit, argId }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <EuiFieldText
        compressed
        id={argId}
        value={value}
        onChange={confirm ? updateValue : (ev) => commit(ev.target.value)}
      />
    </EuiFlexItem>
    {confirm && (
      <EuiFlexItem grow={false} className="canvasSidebar__panel-noMinWidth">
        <EuiButton size="s" onClick={() => commit(value)}>
          {confirm}
        </EuiButton>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

StringArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
  argId: PropTypes.string.isRequired,
};

const EnhancedStringArgInput = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value')
)(StringArgInput);

EnhancedStringArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const string = () => ({
  name: 'string',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(EnhancedStringArgInput),
});
