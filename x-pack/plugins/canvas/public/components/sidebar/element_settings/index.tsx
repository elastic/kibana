/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
// @ts-ignore unconverted local file
import { getElementById, getSelectedPage } from '../../../state/selectors/workpad';
import { ElementSettings as Component } from './element_settings';
import { PositionedElement } from '../../../lib/positioned_element';

interface State {
  persistent: { workpad: { pages: Array<{ elements: PositionedElement[] }> } };
}

interface Props {
  selectedElementId: string;
}

const mapStateToProps = (state: State, { selectedElementId }: Props) => ({
  element: getElementById(state, selectedElementId, getSelectedPage(state)),
});

export const ElementSettings = connect(mapStateToProps)(Component);

ElementSettings.propTypes = {
  selectedElementId: PropTypes.string.isRequired,
};
