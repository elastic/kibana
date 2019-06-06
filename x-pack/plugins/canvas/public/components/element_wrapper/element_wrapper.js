/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Positionable } from '../positionable';
import { ElementContent } from '../element_content';

export const ElementWrapper = props => {
  const { renderable, transformMatrix, width, height, state, handlers } = props;

  return (
    <Positionable transformMatrix={transformMatrix} width={width} height={height}>
      <ElementContent renderable={renderable} state={state} handlers={handlers} />
    </Positionable>
  );
};

ElementWrapper.propTypes = {
  // positionable props (from element object)
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  // ElementContent pass-through props
  renderable: PropTypes.object,
  state: PropTypes.string,
  handlers: PropTypes.object.isRequired,
};
