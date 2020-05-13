/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

const getDisplayName = Comp => Comp.displayName || Comp.name || 'UnnamedComponent';

export function createStatefulPropHoc(fieldname, updater = 'updateValue') {
  return Comp => {
    class WrappedControlledInput extends React.PureComponent {
      constructor(props) {
        super(props);

        this.state = {
          value: props[fieldname],
        };
      }

      UNSAFE_componentWillReceiveProps(nextProps) {
        this.setState({ value: nextProps[fieldname] });
      }

      handleChange = ev => {
        if (ev.target) {
          this.setState({ value: ev.target.value });
        } else {
          this.setState({ value: ev });
        }
      };

      render() {
        const passedProps = {
          ...this.props,
          [fieldname]: this.state.value,
          [updater]: this.handleChange,
        };

        return <Comp {...passedProps} />;
      }
    }

    WrappedControlledInput.propTypes = {
      [fieldname]: PropTypes.any,
    };

    // set the display name of the wrapped component, for easier debugging
    WrappedControlledInput.displayName = `statefulProp(${getDisplayName(Comp)})`;

    return WrappedControlledInput;
  };
}
