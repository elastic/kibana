/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ComponentStrings } from '../../../i18n';
import { Loading } from '../loading';
import { ArgLabel } from './arg_label';

const { ArgFormPendingArgValue: strings } = ComponentStrings;

export class PendingArgValue extends React.PureComponent {
  static propTypes = {
    label: PropTypes.string,
    argTypeInstance: PropTypes.shape({
      help: PropTypes.string.isRequired,
    }).isRequired,
    setResolvedArgValue: PropTypes.func.isRequired,
    templateProps: PropTypes.shape({
      argResolver: PropTypes.func.isRequired,
      argValue: PropTypes.any,
    }),
  };

  componentDidMount() {
    // on mount, resolve the arg value using the argResolver
    const { setResolvedArgValue, templateProps } = this.props;
    const { argResolver, argValue } = templateProps;
    if (argValue == null) {
      setResolvedArgValue(null);
    } else {
      argResolver(argValue)
        .then((val) => setResolvedArgValue(val != null ? val : null))
        .catch(() => setResolvedArgValue(null)); // swallow error, it's not important
    }
  }

  render() {
    const { label, argTypeInstance } = this.props;

    return (
      <div className="canvasArg">
        <ArgLabel
          className="resolve-pending"
          label={label}
          help={argTypeInstance.help}
          expandable={false}
        >
          <div className="canvasArg--pending">
            <Loading animated text={strings.getLoadingMessage()} />
          </div>
        </ArgLabel>
      </div>
    );
  }
}
