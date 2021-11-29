/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { withEuiTheme } from '@elastic/eui';
import { Loading } from '../loading';
import { ArgLabel } from './arg_label';
import { argStylesFactory } from './pending_arg_value.styles';

const strings = {
  getLoadingMessage: () =>
    i18n.translate('xpack.canvas.argFormPendingArgValue.loadingMessage', {
      defaultMessage: 'Loading',
    }),
};

class PendingArgValue extends React.PureComponent {
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
    const { label, argTypeInstance, theme } = this.props;
    return (
      <div css={argStylesFactory(theme.euiTheme)}>
        <ArgLabel label={label} help={argTypeInstance.help} expandable={false}>
          <Loading animated text={strings.getLoadingMessage()} />
        </ArgLabel>
      </div>
    );
  }
}

const PendingArgValueWithTheme = withEuiTheme(PendingArgValue);

export { PendingArgValueWithTheme as PendingArgValue };
