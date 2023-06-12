/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { unmountComponentAtNode } from 'react-dom';
import { useKibana, useToasts } from '../../lib/kibana';
import { ADDED_TO_LIBRARY } from './translations';

export const useSaveToLibrary = ({ attributes }: { attributes: LensEmbeddableInput }) => {
  const { lens } = useKibana().services;
  const { addSuccess } = useToasts();

  const { SaveModalComponent, canUseEditor } = lens;
  const openSaveVisualizationFlyout = useCallback(() => {
    const targetDomElement = document.createElement('div');

    const mount = toMountPoint(
      <SaveModalComponent
        initialInput={attributes}
        onSave={() => {
          unmountComponentAtNode(targetDomElement);
          addSuccess(ADDED_TO_LIBRARY);
        }}
        onClose={() => {
          unmountComponentAtNode(targetDomElement);
        }}
      />
    );

    mount(targetDomElement);
  }, [SaveModalComponent, addSuccess, attributes]);

  const disableVisualizations = useMemo(
    () => !canUseEditor() || attributes == null,
    [attributes, canUseEditor]
  );

  return { openSaveVisualizationFlyout, disableVisualizations };
};
