/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { encode } from '../../../common/lib/embeddable_dataurl';
import { AddEmbeddableFlyout as Component, Props as ComponentProps } from './flyout.component';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { EmbeddableTypes } from '../../../canvas_plugin_src/expression_types/embeddable';
import { State } from '../../../types';
import { useLabsService } from '../../services';

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

type AddEmbeddable = (pageId: string, partialElement: { expression: string }) => void;

type FlyoutProps = Pick<ComponentProps, 'onClose'> & Partial<Omit<ComponentProps, 'onClose'>>;

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

  return createPortal(
    <Component {...props} availableEmbeddables={Object.keys(allowedEmbeddables)} />,
    el
  );
};

export const AddEmbeddablePanel: React.FunctionComponent<FlyoutProps> = ({
  availableEmbeddables,
  ...restProps
}) => {
  const labsService = useLabsService();
  const isByValueEnabled = labsService.isProjectEnabled('labs:canvas:byValueEmbeddable');

  const dispatch = useDispatch();
  const pageId = useSelector<State, string>((state) => getSelectedPage(state));

  const addEmbeddable: AddEmbeddable = useCallback(
    (selectedPageId, partialElement) => dispatch(addElement(selectedPageId, partialElement)),
    [dispatch]
  );

  const onSelect = useCallback(
    (id: string, type: string): void => {
      const partialElement = {
        expression: `markdown "Could not find embeddable for type ${type}" | render`,
      };

      // If by-value is enabled, we'll handle both by-reference and by-value embeddables
      // with the new generic `embeddable` function.
      // Otherwise we fallback to the embeddable type specific expressions.
      if (isByValueEnabled) {
        const config = encode({ savedObjectId: id });
        partialElement.expression = `embeddable config="${config}" 
  type="${type}" 
| render`;
      } else if (allowedEmbeddables[type]) {
        partialElement.expression = allowedEmbeddables[type](id);
      }

      addEmbeddable(pageId, partialElement);
      restProps.onClose();
    },
    [addEmbeddable, pageId, restProps, isByValueEnabled]
  );

  return (
    <EmbeddableFlyoutPortal
      {...restProps}
      availableEmbeddables={availableEmbeddables || []}
      onSelect={onSelect}
      isByValueEnabled={isByValueEnabled}
    />
  );
};
