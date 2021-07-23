/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { withServices } from '../../services';
import { getSelectedPage, getPageById } from '../../state/selectors/workpad';
import { ElementContent as Component } from './element_content';

const getRenderFunction = (renderable, services) =>
  services.expressions.getRenderer(get(renderable, 'as'));

const ElementContentComponent = (props) => {
  const { renderable, services } = props;
  const [renderFunction, setRenderFunctions] = useState(getRenderFunction(renderable, services));

  useEffect(() => {
    setRenderFunctions(getRenderFunction(renderable, services));
  }, [renderable, services]);

  return <Component {...props} renderFunction={renderFunction} />;
};

const mapStateToProps = (state) => ({
  backgroundColor: getPageById(state, getSelectedPage(state)).style.background,
});

export const ElementContent = compose(
  connect(mapStateToProps),
  withServices
)(ElementContentComponent);

ElementContent.propTypes = {
  renderable: PropTypes.shape({
    as: PropTypes.string,
  }),
};
