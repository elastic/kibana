/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { AddEmbeddableFlyout as Component, Props as ComponentProps } from './flyout.component';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { EmbeddableTypes } from '../../../canvas_plugin_src/expression_types/embeddable';

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

type FlyoutProps = Pick<ComponentProps, 'onClose'> & Partial<Omit<ComponentProps, 'onClose'>>;

// FIX: Missing state type
const mapStateToProps = (state: any) => ({ pageId: getSelectedPage(state) });

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  addEmbeddable: (pageId, partialElement): DispatchProps['addEmbeddable'] =>
    dispatch(addElement(pageId, partialElement)),
});

const mergeProps = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: FlyoutProps
): ComponentProps => {
  const { pageId, ...remainingStateProps } = stateProps;
  const { addEmbeddable } = dispatchProps;
  const { availableEmbeddables } = ownProps;
  return {
    ...remainingStateProps,
    ...ownProps,
    availableEmbeddables: availableEmbeddables || [],
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

export const EmbeddableFlyoutPortal: React.FunctionComponent<ComponentProps> = (props) => {
  const el: HTMLElement = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    let body = document.querySelector('body');
    if (body && el) {
      body.appendChild(el);
    }
    return () => {
      body = document.querySelector('body');
      if (body && el) {
        body.removeChild(el);
      }
    };
  }, [el]);

  if (!el) {
    return null;
  }

  return ReactDOM.createPortal(
    <Component {...props} availableEmbeddables={Object.keys(allowedEmbeddables)} />,
    el
  );
};

export const AddEmbeddablePanel = connect<StateProps, DispatchProps, FlyoutProps, ComponentProps>(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(EmbeddableFlyoutPortal);
