/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

export const FunctionFormComponent = (props) => {
  const passedProps = {
    argResolver: props.argResolver,
    args: props.args,
    argType: props.argType,
    argTypeDef: props.argTypeDef,
    filterGroups: props.filterGroups,
    context: props.context,
    expressionIndex: props.expressionIndex,
    expressionType: props.expressionType,
    nextArgType: props.nextArgType,
    nextExpressionType: props.nextExpressionType,
    onAssetAdd: props.onAssetAdd,
    onValueAdd: props.onValueAdd,
    onValueChange: props.onValueChange,
    onValueRemove: props.onValueRemove,
  };

  return <div className="canvasFunctionForm">{props.expressionType.render(passedProps)}</div>;
};

FunctionFormComponent.propTypes = {
  // props passed into expression type render functions
  argResolver: PropTypes.func.isRequired,
  args: PropTypes.object.isRequired,
  argType: PropTypes.string.isRequired,
  argTypeDef: PropTypes.object.isRequired,
  filterGroups: PropTypes.array.isRequired,
  context: PropTypes.object,
  expressionIndex: PropTypes.number.isRequired,
  expressionType: PropTypes.object.isRequired,
  nextArgType: PropTypes.string,
  nextExpressionType: PropTypes.object,
  onAssetAdd: PropTypes.func.isRequired,
  onValueAdd: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
  onValueRemove: PropTypes.func.isRequired,
  onValueRemove: PropTypes.func.isRequired,
};
