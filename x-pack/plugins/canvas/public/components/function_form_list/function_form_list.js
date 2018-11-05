/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FunctionForm } from '../function_form';

export const FunctionFormList = ({ functionFormItems }) => {
  const argTypeComponents = functionFormItems.map(functionFormProps => {
    return (
      <FunctionForm
        {...functionFormProps}
        key={`${functionFormProps.argType}-${functionFormProps.expressionIndex}`}
      />
    );
  });

  return <div>{argTypeComponents}</div>;
};

FunctionFormList.propTypes = {
  functionFormItems: PropTypes.array.isRequired,
};
