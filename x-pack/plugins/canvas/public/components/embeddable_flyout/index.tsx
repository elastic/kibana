/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AddEmbeddableFlyout, Props } from './flyout';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { EmbeddableTypes } from '../../../canvas_plugin_src/expression_types/embeddable';
import { WithKibanaProps } from '../../index';
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';

const allowedEmbeddables = {
  [EmbeddableTypes.map]: (id: string) => {
    return `savedMap id="${id}" | render`;
  },
  [EmbeddableTypes.lens]: (id: string) => {
    return `savedLens id="${id}" | render`;
  },
  [EmbeddableTypes.visualization]: (id: string) => {
    return `savedVisualization id="${id}" | render`;
  },
  /*
  [EmbeddableTypes.search]: (id: string) => {
    return `filters | savedSearch id="${id}" | render`;
  },*/
};

interface StateProps {
  pageId: string;
}

interface DispatchProps {
  addEmbeddable: (pageId: string, partialElement: { expression: string }) => void;
}

// FIX: Missing state type
const mapStateToProps = (state: any) => ({ pageId: getSelectedPage(state) });

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  addEmbeddable: (pageId, partialElement): DispatchProps['addEmbeddable'] =>
    dispatch(addElement(pageId, partialElement)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: Props
): Props => {
  const { pageId, ...remainingStateProps } = stateProps;
  const { addEmbeddable } = dispatchProps;

  return {
    ...remainingStateProps,
    ...ownProps,
    onSelect: (id: string, type: string): void => {
      const partialElement = {
        expression: `markdown "Could not find embeddable for type ${type}" | render`,
      };
      if (allowedEmbeddables[type]) {
        partialElement.expression = allowedEmbeddables[type](id);
      }

      addEmbeddable(pageId, partialElement);
      ownProps.onClose();
    },
  };
};

export class EmbeddableFlyoutPortal extends React.Component<Props & WithKibanaProps> {
  el?: HTMLElement;

  constructor(props: Props & WithKibanaProps) {
    super(props);

    this.el = document.createElement('div');
  }
  componentDidMount() {
    const body = document.querySelector('body');
    if (body && this.el) {
      body.appendChild(this.el);
    }
  }

  componentWillUnmount() {
    const body = document.querySelector('body');

    if (body && this.el) {
      body.removeChild(this.el);
    }
  }

  render() {
    if (this.el) {
      return ReactDOM.createPortal(
        <AddEmbeddableFlyout
          {...this.props}
          availableEmbeddables={Object.keys(allowedEmbeddables)}
          savedObjects={this.props.kibana.services.savedObjects}
          uiSettings={this.props.kibana.services.uiSettings}
          getEmbeddableFactories={this.props.kibana.services.embeddable.getEmbeddableFactories}
        />,
        this.el
      );
    }
  }
}

export const AddEmbeddablePanel = compose<Props & WithKibanaProps, { onClose: () => void }>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withKibana
)(EmbeddableFlyoutPortal);
