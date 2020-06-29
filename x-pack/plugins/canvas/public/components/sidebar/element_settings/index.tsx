/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { connect } from 'react-redux';
import { getElementById, getSelectedPage } from '../../../state/selectors/workpad';
import { ElementSettings as Component } from './element_settings';
import { State, PositionedElement } from '../../../../types';

interface Props {
  selectedElementId: string;
}

const mapStateToProps = (state: State, { selectedElementId }: Props): StateProps => ({
  element: getElementById(state, selectedElementId, getSelectedPage(state)),
});

interface StateProps {
  element: PositionedElement | undefined;
}

const renderIfElement: React.FunctionComponent<StateProps> = (props) => {
  if (props.element) {
    return <Component element={props.element} />;
  }

  return null;
};

export const ElementSettings = connect<StateProps, {}, Props, State>(mapStateToProps)(
  renderIfElement
);
