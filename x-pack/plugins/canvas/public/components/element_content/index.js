/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { get } from 'lodash';
import { renderFunctionsRegistry } from '@kbn/interpreter/public';
import { ElementContent as Component } from './element_content';

export const ElementContent = compose(
  withProps(({ renderable }) => ({
    renderFunction: renderFunctionsRegistry.get(get(renderable, 'as')),
  }))
)(Component);

ElementContent.propTypes = {
  renderable: PropTypes.shape({
    as: PropTypes.string,
  }),
};
